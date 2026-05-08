import type { Plugin } from "obsidian";
import type { FeedItem } from "../models/FeedItem";
import type { FeedSource } from "../models/FeedSource";
import { createDefaultUserState, type UserState } from "../models/UserState";
import type { Logger } from "./Logger";

export interface PersistedState {
  schemaVersion: number;
  feeds: FeedSource[];
  items: FeedItem[];
  userState: {
    readIds: string[];
    savedIds: string[];
    starredIds: string[];
    ignoredIds: string[];
    scrollPositions: Record<string, number>;
  };
  uiState?: {
    activeView: "all" | "unread" | "starred" | "videos" | "articles";
    activeFeedId: string | null;
    compactMode: boolean;
    distractionFree: boolean;
  };
}

export interface HydratedState {
  feeds: FeedSource[];
  items: FeedItem[];
  userState: UserState;
  uiState: {
    activeView: "all" | "unread" | "starred" | "videos" | "articles";
    activeFeedId: string | null;
    compactMode: boolean;
    distractionFree: boolean;
  };
}

const SCHEMA_VERSION = 1;

export class StateService {
  private pending: PersistedState | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly plugin: Plugin, private readonly logger: Logger) {}

  async load(): Promise<HydratedState> {
    try {
      const raw = (await this.plugin.loadData()) as Partial<PersistedState> | null;
      if (!raw) return this.defaultHydrated();
      const user = raw.userState;
      return {
        feeds: raw.feeds ?? [],
        items: raw.items ?? [],
        userState: {
          readIds: new Set(user?.readIds ?? []),
          savedIds: new Set(user?.savedIds ?? []),
          starredIds: new Set(user?.starredIds ?? []),
          ignoredIds: new Set(user?.ignoredIds ?? []),
          scrollPositions: user?.scrollPositions ?? {},
        },
        uiState: {
          activeView: raw.uiState?.activeView ?? "all",
          activeFeedId: raw.uiState?.activeFeedId ?? null,
          compactMode: raw.uiState?.compactMode ?? false,
          distractionFree: raw.uiState?.distractionFree ?? false,
        },
      };
    } catch (error) {
      this.logger.warn("State unreadable, defaulting", error);
      return this.defaultHydrated();
    }
  }

  save(state: HydratedState): void {
    this.pending = {
      schemaVersion: SCHEMA_VERSION,
      feeds: state.feeds,
      items: state.items,
      userState: {
        readIds: [...state.userState.readIds],
        savedIds: [...state.userState.savedIds],
        starredIds: [...state.userState.starredIds],
        ignoredIds: [...state.userState.ignoredIds],
        scrollPositions: state.userState.scrollPositions,
      },
      uiState: state.uiState,
    };

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flushAsync(), 250);
  }

  flush(): void {
    if (!this.pending) return;
    void this.plugin.saveData(this.pending);
    this.pending = null;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async flushAsync(): Promise<void> {
    if (!this.pending) return;
    await this.plugin.saveData(this.pending);
    this.pending = null;
    this.timer = null;
  }

  private defaultHydrated(): HydratedState {
    return {
      feeds: [],
      items: [],
      userState: createDefaultUserState(),
      uiState: { activeView: "all", activeFeedId: null, compactMode: false, distractionFree: false },
    };
  }
}
