import { requestUrl } from "obsidian";
import type { FeedSource } from "../models/FeedSource";
import type { ISourceAdapter } from "./adapters/ISourceAdapter";

export class FeedDiscoveryService {
  constructor(private readonly adapters: ISourceAdapter[]) {}

  async resolve(url: string): Promise<FeedSource> {
    const normalized = url.trim();
    for (const adapter of this.adapters) {
      if (!adapter.detect(normalized)) continue;
      const resolved = await adapter.resolve(normalized);
      const source = Array.isArray(resolved) ? resolved[0] : resolved;
      if (source) return source;
    }

    const discovered = await this.autodiscoverWebsiteFeed(normalized);
    if (discovered) {
      return {
        id: crypto.randomUUID(),
        url: discovered,
        displayName: new URL(normalized).hostname,
        sourceType: "website",
        tags: [],
        refreshIntervalMin: 30,
        notifyOnNew: false,
      };
    }

    throw new Error(`Unable to discover feed for URL: ${normalized}`);
  }

  private async autodiscoverWebsiteFeed(url: string): Promise<string | null> {
    try {
      const html = (await requestUrl({ url })).text;
      const linkMatch = html.match(/<link[^>]+type=["']application\/(rss\+xml|atom\+xml)["'][^>]*>/i);
      if (linkMatch) {
        const hrefMatch = linkMatch[0].match(/href=["']([^"']+)["']/i);
        if (hrefMatch?.[1]) {
          return new URL(hrefMatch[1], url).toString();
        }
      }
    } catch {
      // Continue to fallback probes.
    }

    const root = new URL(url);
    const candidates = ["/feed", "/rss", "/atom.xml"];
    for (const path of candidates) {
      const candidate = new URL(path, root.origin).toString();
      try {
        const response = await requestUrl({ url: candidate });
        if (response.status >= 200 && response.status < 300 && response.text.includes("<")) {
          return candidate;
        }
      } catch {
        // Probe next candidate.
      }
    }

    return null;
  }
}
