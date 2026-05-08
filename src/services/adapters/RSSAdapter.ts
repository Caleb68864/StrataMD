import { XMLParser } from "fast-xml-parser";
import { requestUrl, type RequestUrlResponse } from "obsidian";
import type { FeedItem } from "../../models/FeedItem";
import type { FeedSource } from "../../models/FeedSource";
import type { ISourceAdapter } from "./ISourceAdapter";

type RawFeed = { xml: string; source: FeedSource };

export class RSSAdapter implements ISourceAdapter {
  readonly name = "rss";
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    processEntities: false,
    trimValues: true,
  });

  constructor() {}

  detect(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  async resolve(url: string): Promise<FeedSource> {
    return {
      id: crypto.randomUUID(),
      url,
      displayName: url,
      sourceType: "rss",
      tags: [],
      refreshIntervalMin: 30,
      notifyOnNew: false,
    };
  }

  async fetch(source: FeedSource): Promise<RawFeed> {
    const response: RequestUrlResponse = await requestUrl({ url: source.url });
    return { xml: response.text, source };
  }

  parse(raw: unknown): FeedItem[] {
    const cast = raw as RawFeed;
    const parsed = this.parser.parse(cast.xml);
    const channel = parsed?.rss?.channel;
    const entries = channel?.item ?? parsed?.feed?.entry ?? [];
    const list = Array.isArray(entries) ? entries : [entries];
    return [];
  }

  async parseFromFetch(raw: RawFeed): Promise<FeedItem[]> {
    const parsed = this.parser.parse(raw.xml);
    const channel = parsed?.rss?.channel;
    const entries = channel?.item ?? parsed?.feed?.entry ?? [];
    const list = Array.isArray(entries) ? entries : [entries];
    return list.filter(Boolean).map((item: Record<string, unknown>, idx: number) => {
      const mediaGroup = this.asRecord(item["media:group"]);
      const mediaThumb = this.asRecord(item["media:thumbnail"]) ?? this.asRecord(mediaGroup?.["media:thumbnail"]);
      const ytVideoId = this.asString(item["yt:videoId"]);
      const rawDuration = this.asString(item["media:duration"]) ?? this.asString(mediaGroup?.["media:duration"]);
      const durationSec = rawDuration ? Number.parseInt(rawDuration, 10) : undefined;
      const isYouTube = raw.source.sourceType === "youtube" || Boolean(ytVideoId);
      return {
      id: String(item.guid ?? `${raw.source.id}-${idx}-${String(item.link ?? item.title ?? "item")}`),
      feedId: raw.source.id,
      sourceType: raw.source.sourceType,
      title: String(item.title ?? "Untitled"),
      url: String(item.link ?? raw.source.url),
      author: item.creator ? String(item.creator) : item.author ? String(item.author) : undefined,
      published: String(item.isoDate ?? item.pubDate ?? new Date().toISOString()),
      summary: item.description ? String(item.description) : item.content ? String(item.content) : "",
      thumbnailUrl: this.asString(mediaThumb?.url),
      mediaType: isYouTube ? "video" : "article",
      durationSec: Number.isFinite(durationSec) ? durationSec : undefined,
    };});
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
  }

  private asString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
  }
}
