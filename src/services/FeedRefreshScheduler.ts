import type { FeedItem } from "../models/FeedItem";
import type { FeedSource } from "../models/FeedSource";
import { RSSAdapter } from "./adapters/RSSAdapter";

interface FeedRunState {
  failCount: number;
  lastSuccessAt: number | null;
  nextAllowedAt: number;
}

export interface RefreshEvent {
  type: "batch_start" | "batch_end" | "feed_start" | "feed_success" | "feed_error";
  feedId?: string;
  message?: string;
}

export class FeedRefreshScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private inflight = new Set<string>();
  private states = new Map<string, FeedRunState>();
  private listeners = new Set<(event: RefreshEvent) => void>();

  constructor(
    private readonly rssAdapter: RSSAdapter,
    private readonly onItems: (feedId: string, items: FeedItem[]) => void,
    private readonly options: { concurrency: number; tickMs: number; baseBackoffMs: number; maxBackoffMs: number; staggerMs: number } = {
      concurrency: 4,
      tickMs: 60_000,
      baseBackoffMs: 5_000,
      maxBackoffMs: 300_000,
      staggerMs: 200,
    },
  ) {}

  start(getFeeds: () => FeedSource[]): void {
    this.stop();
    this.timer = setInterval(() => {
      void this.refreshAll(getFeeds());
    }, this.options.tickMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  onEvent(listener: (event: RefreshEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async refreshAll(feeds: FeedSource[]): Promise<void> {
    this.emit({ type: "batch_start" });
    const queue = feeds.slice();
    const workers = Array.from({ length: Math.max(1, this.options.concurrency) }).map(async () => {
      while (queue.length > 0) {
        const feed = queue.shift();
        if (!feed) return;
        await this.refreshOne(feed);
        if (this.options.staggerMs > 0) await this.sleep(this.options.staggerMs);
      }
    });
    await Promise.all(workers);
    this.emit({ type: "batch_end" });
  }

  async refreshOne(feed: FeedSource): Promise<void> {
    if (this.inflight.has(feed.id)) return;
    const state = this.getState(feed.id);
    const now = Date.now();
    if (state.nextAllowedAt > now) return;

    this.inflight.add(feed.id);
    this.emit({ type: "feed_start", feedId: feed.id });
    try {
      const raw = await this.rssAdapter.fetch(feed);
      const items = await this.rssAdapter.parseFromFetch(raw as { xml: string; source: FeedSource });
      this.onItems(feed.id, items);
      state.failCount = 0;
      state.lastSuccessAt = now;
      state.nextAllowedAt = now + feed.refreshIntervalMin * 60_000;
      this.emit({ type: "feed_success", feedId: feed.id });
    } catch (error) {
      state.failCount += 1;
      const backoff = Math.min(this.options.baseBackoffMs * 2 ** (state.failCount - 1), this.options.maxBackoffMs);
      state.nextAllowedAt = Date.now() + backoff;
      const message = error instanceof Error ? error.message : "Unknown refresh error";
      this.emit({ type: "feed_error", feedId: feed.id, message });
    } finally {
      this.inflight.delete(feed.id);
    }
  }

  private getState(feedId: string): FeedRunState {
    const existing = this.states.get(feedId);
    if (existing) return existing;
    const created: FeedRunState = { failCount: 0, lastSuccessAt: null, nextAllowedAt: 0 };
    this.states.set(feedId, created);
    return created;
  }

  private emit(event: RefreshEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
