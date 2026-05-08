import type { FeedItem } from "../../models/FeedItem";
import type { FeedSource } from "../../models/FeedSource";
import type { ISourceAdapter } from "./ISourceAdapter";

export class MockAdapter implements ISourceAdapter {
  readonly name = "mock";

  detect(_url: string): boolean {
    return true;
  }

  async resolve(url: string): Promise<FeedSource> {
    return {
      id: crypto.randomUUID(),
      url,
      displayName: "Imported Feed",
      sourceType: "mock",
      tags: [],
      refreshIntervalMin: 30,
      notifyOnNew: false,
    };
  }

  async fetch(_source: FeedSource): Promise<unknown> {
    return {};
  }

  parse(_raw: unknown): FeedItem[] {
    return [];
  }
}
