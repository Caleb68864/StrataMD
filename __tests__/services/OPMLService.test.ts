import { describe, expect, it } from "vitest";
import { OPMLService } from "../../src/services/opml/OPMLService";

describe("OPMLService", () => {
  it("parses OPML outlines into feed entries", () => {
    const xml = `<?xml version="1.0"?><opml version="2.0"><body><outline text="Tech"><outline text="Feed A" xmlUrl="https://a.com/feed"/><outline text="Feed B" xmlUrl="https://b.com/rss" category="news"/></outline></body></opml>`;
    const svc = new OPMLService();
    const parsed = svc.parse(xml);
    expect(parsed.errors).toEqual([]);
    expect(parsed.feeds).toHaveLength(2);
    expect(parsed.feeds[0]?.xmlUrl).toBe("https://a.com/feed");
    expect(parsed.feeds[1]?.category).toBe("news");
  });

  it("returns errors for invalid OPML", () => {
    const svc = new OPMLService();
    const parsed = svc.parse("not xml");
    expect(parsed.feeds).toHaveLength(0);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });
});
