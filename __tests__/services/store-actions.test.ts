import { beforeEach, describe, expect, it } from "vitest";
import { useStrataStore } from "../../src/store/useStrataStore";

const seed = {
  id: "i1",
  feedId: "f1",
  sourceType: "rss" as const,
  title: "A",
  url: "https://a.com",
  published: new Date().toISOString(),
  mediaType: "article" as const,
};

describe("useStrataStore triage actions", () => {
  beforeEach(() => {
    useStrataStore.setState({
      feeds: [],
      items: [seed, { ...seed, id: "i2", title: "B" }, { ...seed, id: "i3", title: "C" }],
      selectedItemId: "i1",
      searchQuery: "",
      activeView: "all",
      activeFeedId: null,
      compactMode: false,
      distractionFree: false,
      isRefreshing: false,
      refreshingFeedIds: new Set<string>(),
      feedErrors: {},
      userState: {
        readIds: new Set<string>(),
        savedIds: new Set<string>(),
        starredIds: new Set<string>(),
        ignoredIds: new Set<string>(),
        scrollPositions: {},
      },
    } as any);
  });

  it("marks all visible items read", () => {
    useStrataStore.getState().markAllReadIn(["i1", "i2", "i3"]);
    expect(useStrataStore.getState().userState.readIds.size).toBe(3);
  });

  it("toggles saved and ignored", () => {
    useStrataStore.getState().toggleSaved("i1");
    useStrataStore.getState().toggleIgnored("i2");
    expect(useStrataStore.getState().userState.savedIds.has("i1")).toBe(true);
    expect(useStrataStore.getState().userState.ignoredIds.has("i2")).toBe(true);
    useStrataStore.getState().toggleSaved("i1");
    expect(useStrataStore.getState().userState.savedIds.has("i1")).toBe(false);
  });

  it("jumps to first/last item", () => {
    useStrataStore.getState().selectLastIn(["i1", "i2", "i3"]);
    expect(useStrataStore.getState().selectedItemId).toBe("i3");
    useStrataStore.getState().selectFirstIn(["i1", "i2", "i3"]);
    expect(useStrataStore.getState().selectedItemId).toBe("i1");
  });
});
