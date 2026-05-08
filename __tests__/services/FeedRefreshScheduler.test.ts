import { describe, expect, it, vi } from "vitest";
import { FeedRefreshScheduler } from "../../src/services/FeedRefreshScheduler";

class MockRssAdapter {
  public calls = 0;
  constructor(private readonly shouldFail = false) {}
  async fetch(source: { url: string }) {
    this.calls += 1;
    if (this.shouldFail) throw new Error("fetch failed");
    return { xml: `<rss><channel><item><title>T</title><link>${source.url}</link></item></channel></rss>`, source };
  }
  async parseFromFetch(raw: any) {
    return [{ id: "1", feedId: raw.source.id, sourceType: raw.source.sourceType, title: "T", url: raw.source.url, published: new Date().toISOString(), mediaType: "article" }];
  }
}

describe("FeedRefreshScheduler", () => {
  it("dedupes inflight refreshes", async () => {
    const adapter = new MockRssAdapter();
    const onItems = vi.fn();
    const scheduler = new FeedRefreshScheduler(adapter as any, onItems, { concurrency: 1, tickMs: 1000, baseBackoffMs: 1, maxBackoffMs: 5, staggerMs: 0 });
    const feed = { id: "f1", url: "https://x.com/feed", sourceType: "rss", refreshIntervalMin: 0, displayName: "x", tags: [], notifyOnNew: false };

    await Promise.all([scheduler.refreshOne(feed as any), scheduler.refreshOne(feed as any)]);
    expect(adapter.calls).toBe(1);
    expect(onItems).toHaveBeenCalledTimes(1);
  });

  it("emits feed_error on failure", async () => {
    const adapter = new MockRssAdapter(true);
    const scheduler = new FeedRefreshScheduler(adapter as any, vi.fn(), { concurrency: 1, tickMs: 1000, baseBackoffMs: 1, maxBackoffMs: 5, staggerMs: 0 });
    const events: string[] = [];
    scheduler.onEvent((e) => events.push(e.type));
    const feed = { id: "f1", url: "https://x.com/feed", sourceType: "rss", refreshIntervalMin: 0, displayName: "x", tags: [], notifyOnNew: false };

    await scheduler.refreshOne(feed as any);
    expect(events).toContain("feed_error");
  });

  it("emits batch start and end", async () => {
    const adapter = new MockRssAdapter();
    const scheduler = new FeedRefreshScheduler(adapter as any, vi.fn(), { concurrency: 2, tickMs: 1000, baseBackoffMs: 1, maxBackoffMs: 5, staggerMs: 0 });
    const events: string[] = [];
    scheduler.onEvent((e) => events.push(e.type));
    const feeds = [
      { id: "f1", url: "https://x.com/feed", sourceType: "rss", refreshIntervalMin: 0, displayName: "x", tags: [], notifyOnNew: false },
      { id: "f2", url: "https://y.com/feed", sourceType: "rss", refreshIntervalMin: 0, displayName: "y", tags: [], notifyOnNew: false },
    ];

    await scheduler.refreshAll(feeds as any);
    expect(events[0]).toBe("batch_start");
    expect(events[events.length - 1]).toBe("batch_end");
  });
});
