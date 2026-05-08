import { requestUrl } from "obsidian";
import type { FeedItem } from "../../models/FeedItem";
import type { FeedSource } from "../../models/FeedSource";
import type { ISourceAdapter } from "./ISourceAdapter";

export class YouTubeAdapter implements ISourceAdapter {
  readonly name = "youtube";

  detect(url: string): boolean {
    return /youtube\.com|youtu\.be/i.test(url);
  }

  async resolve(url: string): Promise<FeedSource> {
    const resolvedUrl = await this.resolveYoutubeFeedUrl(url);
    return {
      id: crypto.randomUUID(),
      url: resolvedUrl,
      displayName: this.buildDisplayName(url),
      sourceType: "youtube",
      tags: ["youtube"],
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

  private async resolveYoutubeFeedUrl(url: string): Promise<string> {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("youtu.be")) {
      throw new Error("Short YouTube video URLs are not a subscribable feed source.");
    }

    const channelIdMatch = parsed.pathname.match(/^\/channel\/([^/]+)/i);
    if (channelIdMatch?.[1]) return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelIdMatch[1]}`;

    const handleMatch = parsed.pathname.match(/^\/@([^/]+)/i);
    if (handleMatch?.[1]) return this.resolveChannelIdFromPage(`https://www.youtube.com/@${handleMatch[1]}`);

    const userMatch = parsed.pathname.match(/^\/user\/([^/]+)/i);
    if (userMatch?.[1]) return this.resolveChannelIdFromPage(`https://www.youtube.com/user/${userMatch[1]}`);

    const customMatch = parsed.pathname.match(/^\/c\/([^/]+)/i);
    if (customMatch?.[1]) return this.resolveChannelIdFromPage(`https://www.youtube.com/c/${customMatch[1]}`);

    const listId = parsed.searchParams.get("list");
    if (listId) return `https://www.youtube.com/feeds/videos.xml?playlist_id=${listId}`;

    throw new Error("Unsupported YouTube URL. Use channel, handle, user, custom, or playlist URLs.");
  }

  private async resolveChannelIdFromPage(url: string): Promise<string> {
    const html = (await requestUrl({ url })).text;
    const metaMatch = html.match(/itemprop="channelId"\s+content="([^"]+)"/i);
    if (!metaMatch?.[1]) {
      throw new YouTubeResolutionError(
        "Could not resolve channel ID from YouTube page. Provide a channel ID or feed URL manually.",
      );
    }
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${metaMatch[1]}`;
  }

  private buildDisplayName(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith("/@")) return parsed.pathname.slice(2);
      return `YouTube: ${parsed.pathname || parsed.hostname}`;
    } catch {
      return "YouTube";
    }
  }
}

export class YouTubeResolutionError extends Error {
  readonly code = "YOUTUBE_RESOLUTION_FAILED";
}
