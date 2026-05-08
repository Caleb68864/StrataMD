import type { FeedItem } from "../../models/FeedItem";
import type { FeedSource } from "../../models/FeedSource";

export interface ISourceAdapter {
  readonly name: string;
  detect(url: string): boolean;
  resolve(url: string): Promise<FeedSource | FeedSource[]>;
  fetch(source: FeedSource): Promise<unknown>;
  parse(raw: unknown): FeedItem[];
}
