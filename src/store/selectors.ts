import type { FeedItem } from "../models/FeedItem";
import { useStrataStore } from "./useStrataStore";

export function selectFilteredItems(): FeedItem[] {
  const state = useStrataStore.getState();
  let items = state.items;
  if (state.activeFeedId) {
    items = items.filter((it) => it.feedId === state.activeFeedId);
  }
  if (state.activeView === "unread") {
    items = items.filter((it) => !state.userState.readIds.has(it.id));
  } else if (state.activeView === "starred") {
    items = items.filter((it) => state.userState.starredIds.has(it.id));
  } else if (state.activeView === "videos") {
    items = items.filter((it) => it.mediaType === "video");
  } else if (state.activeView === "articles") {
    items = items.filter((it) => it.mediaType === "article");
  }
  const q = state.searchQuery.trim().toLowerCase();
  if (!q) return items;
  return items.filter((it) => (it.title + " " + (it.summary ?? "")).toLowerCase().includes(q));
}
