export type FeedSourceType = "rss" | "youtube" | "website" | "mock";

export interface FeedSource {
  id: string;
  url: string;
  displayName: string;
  sourceType: FeedSourceType;
  category?: string;
  tags: string[];
  refreshIntervalMin: number;
  notifyOnNew: boolean;
  pruneAfterDays?: number;
}
