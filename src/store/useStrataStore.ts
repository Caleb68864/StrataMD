import { create } from "zustand";
import type { FeedItem } from "../models/FeedItem";
import type { FeedSource } from "../models/FeedSource";
import { createDefaultUserState, type UserState } from "../models/UserState";

interface StrataState {
  feeds: FeedSource[];
  items: FeedItem[];
  userState: UserState;
  selectedItemId: string | null;
  searchQuery: string;
  activeView: "all" | "unread" | "starred" | "videos" | "articles";
  activeFeedId: string | null;
  compactMode: boolean;
  distractionFree: boolean;
  isRefreshing: boolean;
  refreshingFeedIds: Set<string>;
  feedErrors: Record<string, string>;
  setFeeds: (feeds: FeedSource[]) => void;
  setItems: (items: FeedItem[]) => void;
  upsertFeed: (feed: FeedSource) => void;
  mergeFeedItems: (feedId: string, items: FeedItem[]) => void;
  hydrate: (payload: {
    feeds: FeedSource[];
    items: FeedItem[];
    userState: UserState;
    uiState: {
      activeView: "all" | "unread" | "starred" | "videos" | "articles";
      activeFeedId: string | null;
      compactMode: boolean;
      distractionFree: boolean;
    };
  }) => void;
  selectItem: (itemId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveView: (view: "all" | "unread" | "starred" | "videos" | "articles") => void;
  setActiveFeedId: (feedId: string | null) => void;
  toggleCompactMode: () => void;
  toggleDistractionFree: () => void;
  markRead: (itemId: string) => void;
  markUnread: (itemId: string) => void;
  toggleStar: (itemId: string) => void;
  toggleSaved: (itemId: string) => void;
  toggleIgnored: (itemId: string) => void;
  selectNextIn: (visibleIds: string[]) => void;
  selectPrevIn: (visibleIds: string[]) => void;
  selectFirstIn: (visibleIds: string[]) => void;
  selectLastIn: (visibleIds: string[]) => void;
  markAllReadIn: (visibleIds: string[]) => void;
  setBatchRefreshing: (refreshing: boolean) => void;
  setFeedRefreshing: (feedId: string, refreshing: boolean) => void;
  setFeedError: (feedId: string, message?: string) => void;
}

export const useStrataStore = create<StrataState>((set) => ({
  feeds: [],
  items: [],
  userState: createDefaultUserState(),
  selectedItemId: null,
  searchQuery: "",
  activeView: "all",
  activeFeedId: null,
  compactMode: false,
  distractionFree: false,
  isRefreshing: false,
  refreshingFeedIds: new Set<string>(),
  feedErrors: {},
  setFeeds: (feeds) => set({ feeds }),
  setItems: (items) => set({ items }),
  upsertFeed: (feed) =>
    set((state) => {
      const existing = state.feeds.find((f) => f.id === feed.id || f.url === feed.url);
      if (!existing) return { feeds: [...state.feeds, feed] };
      return { feeds: state.feeds.map((f) => (f.id === existing.id ? { ...existing, ...feed } : f)) };
    }),
  mergeFeedItems: (feedId, incoming) =>
    set((state) => {
      const keep = state.items.filter((item) => item.feedId !== feedId);
      return { items: [...incoming, ...keep] };
    }),
  hydrate: (payload) =>
    set({
      feeds: payload.feeds,
      items: payload.items,
      userState: payload.userState,
      activeView: payload.uiState.activeView,
      activeFeedId: payload.uiState.activeFeedId,
      compactMode: payload.uiState.compactMode,
      distractionFree: payload.uiState.distractionFree,
    }),
  selectItem: (selectedItemId) => set({ selectedItemId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveView: (activeView) => set({ activeView, activeFeedId: null, selectedItemId: null }),
  setActiveFeedId: (activeFeedId) => set({ activeFeedId, activeView: "all", selectedItemId: null }),
  toggleCompactMode: () => set((state) => ({ compactMode: !state.compactMode })),
  toggleDistractionFree: () => set((state) => ({ distractionFree: !state.distractionFree })),
  markRead: (itemId) =>
    set((state) => ({
      userState: { ...state.userState, readIds: new Set([...state.userState.readIds, itemId]) },
    })),
  markUnread: (itemId) =>
    set((state) => {
      const next = new Set(state.userState.readIds);
      next.delete(itemId);
      return { userState: { ...state.userState, readIds: next } };
    }),
  toggleStar: (itemId) =>
    set((state) => {
      const next = new Set(state.userState.starredIds);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return { userState: { ...state.userState, starredIds: next } };
    }),
  toggleSaved: (itemId) =>
    set((state) => {
      const next = new Set(state.userState.savedIds);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return { userState: { ...state.userState, savedIds: next } };
    }),
  toggleIgnored: (itemId) =>
    set((state) => {
      const next = new Set(state.userState.ignoredIds);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return { userState: { ...state.userState, ignoredIds: next } };
    }),
  selectNextIn: (visibleIds) =>
    set((state) => {
      if (visibleIds.length === 0) return state;
      const idx = Math.max(visibleIds.indexOf(state.selectedItemId ?? ""), 0);
      return { selectedItemId: visibleIds[Math.min(idx + 1, visibleIds.length - 1)] };
    }),
  selectPrevIn: (visibleIds) =>
    set((state) => {
      if (visibleIds.length === 0) return state;
      const currentIdx = visibleIds.indexOf(state.selectedItemId ?? "");
      const idx = currentIdx === -1 ? 0 : currentIdx;
      return { selectedItemId: visibleIds[Math.max(idx - 1, 0)] };
    }),
  selectFirstIn: (visibleIds) => set({ selectedItemId: visibleIds[0] ?? null }),
  selectLastIn: (visibleIds) => set({ selectedItemId: visibleIds[visibleIds.length - 1] ?? null }),
  markAllReadIn: (visibleIds) =>
    set((state) => ({
      userState: {
        ...state.userState,
        readIds: new Set([...state.userState.readIds, ...visibleIds]),
      },
    })),
  setBatchRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
  setFeedRefreshing: (feedId, refreshing) =>
    set((state) => {
      const next = new Set(state.refreshingFeedIds);
      if (refreshing) next.add(feedId);
      else next.delete(feedId);
      return { refreshingFeedIds: next };
    }),
  setFeedError: (feedId, message) =>
    set((state) => {
      const next = { ...state.feedErrors };
      if (!message) delete next[feedId];
      else next[feedId] = message;
      return { feedErrors: next };
    }),
}));
