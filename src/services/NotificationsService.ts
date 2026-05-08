import { Notice } from "obsidian";
import type { FeedSource } from "../models/FeedSource";

export class NotificationsService {
  private lastByFeed = new Map<string, number>();
  constructor(private readonly suppressAll: () => boolean) {}

  notifyNewItems(feed: FeedSource, count: number): void {
    if (this.suppressAll()) return;
    if (!feed.notifyOnNew || count <= 0) return;
    const now = Date.now();
    const last = this.lastByFeed.get(feed.id) ?? 0;
    if (now - last < 5 * 60_000) return;
    this.lastByFeed.set(feed.id, now);
    new Notice(`${feed.displayName}: ${count} new items`);
  }
}
