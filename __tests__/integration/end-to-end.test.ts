import { describe, expect, it } from "vitest";
import { useStrataStore } from "../../src/store/useStrataStore";
import { selectFilteredItems } from "../../src/store/selectors";

describe("Integration workflow", () => {
  it("hydrates, filters unread view, and preserves selection behavior", () => {
    const now = new Date().toISOString();
    useStrataStore.setState({
      feeds: [{ id: "f1", url: "https://a.com/feed", displayName: "A", sourceType: "rss", tags: [], refreshIntervalMin: 30, notifyOnNew: false }],
      items: [
        { id: "i1", feedId: "f1", sourceType: "rss", title: "Alpha", url: "https://a.com/1", published: now, mediaType: "article" },
        { id: "i2", feedId: "f1", sourceType: "rss", title: "Beta", url: "https://a.com/2", published: now, mediaType: "article" },
      ],
      selectedItemId: "i1",
      searchQuery: "",
      activeView: "all",
      activeFeedId: null,
      compactMode: false,
      distractionFree: false,
      isRefreshing: false,
      refreshingFeedIds: new Set(),
      feedErrors: {},
      userState: {
        readIds: new Set(["i1"]),
        savedIds: new Set(),
        starredIds: new Set(),
        ignoredIds: new Set(),
        scrollPositions: {},
      },
    } as any);

    useStrataStore.getState().setActiveView("unread");
    const filtered = selectFilteredItems();
    expect(filtered.map((x) => x.id)).toEqual(["i2"]);

    useStrataStore.getState().selectFirstIn(filtered.map((x) => x.id));
    expect(useStrataStore.getState().selectedItemId).toBe("i2");

    useStrataStore.getState().toggleStar("i2");
    expect(useStrataStore.getState().userState.starredIds.has("i2")).toBe(true);
  });
});
