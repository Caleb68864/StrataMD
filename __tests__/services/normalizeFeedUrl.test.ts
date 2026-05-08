import { describe, expect, it } from "vitest";
import { normalizeFeedUrl } from "../../src/services/normalizeFeedUrl";

describe("normalizeFeedUrl", () => {
  it("normalizes default ports and trailing slash", () => {
    expect(normalizeFeedUrl("https://example.com:443/feed/")).toBe("https://example.com/feed");
    expect(normalizeFeedUrl("http://example.com:80/rss/")).toBe("http://example.com/rss");
  });

  it("strips hash", () => {
    expect(normalizeFeedUrl("https://example.com/feed#section")).toBe("https://example.com/feed");
  });
});
