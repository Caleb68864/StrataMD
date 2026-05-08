import type { FeedSourceType } from "./FeedSource";

export type FeedMediaType = "article" | "video" | "audio";

export interface FeedItem {
  id: string;
  feedId: string;
  sourceType: FeedSourceType;
  title: string;
  url: string;
  author?: string;
  published: string;
  summary?: string;
  thumbnailUrl?: string;
  mediaType: FeedMediaType;
  durationSec?: number;
}
