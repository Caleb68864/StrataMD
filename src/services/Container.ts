import type { App, Plugin } from "obsidian";
import type { StrataPluginSettings } from "../settings";
import { useStrataStore } from "../store/useStrataStore";
import { ArticlePreviewService } from "./ArticlePreviewService";
import { CacheService } from "./CacheService";
import { FeedDiscoveryService } from "./FeedDiscoveryService";
import { FeedRefreshScheduler } from "./FeedRefreshScheduler";
import { Logger } from "./Logger";
import { NoteService } from "./NoteService";
import { NotificationsService } from "./NotificationsService";
import { StateService } from "./StateService";
import { MockAdapter } from "./adapters/MockAdapter";
import { RSSAdapter } from "./adapters/RSSAdapter";
import { YouTubeAdapter } from "./adapters/YouTubeAdapter";
import { OPMLService } from "./opml/OPMLService";

export interface Container {
  app: App;
  plugin: Plugin;
  logger: Logger;
  stateService: StateService;
  cacheService: CacheService;
  mockAdapter: MockAdapter;
  rssAdapter: RSSAdapter;
  youtubeAdapter: YouTubeAdapter;
  discoveryService: FeedDiscoveryService;
  scheduler: FeedRefreshScheduler;
  noteService: NoteService;
  notificationsService: NotificationsService;
  opmlService: OPMLService;
  articlePreviewService: ArticlePreviewService;
}

export function createContainer(plugin: Plugin, settings: StrataPluginSettings): Container {
  const logger = new Logger();
  const rssAdapter = new RSSAdapter();
  const youtubeAdapter = new YouTubeAdapter();
  const discoveryService = new FeedDiscoveryService([youtubeAdapter, rssAdapter]);
  const scheduler = new FeedRefreshScheduler(
    rssAdapter,
    (feedId, items) => useStrataStore.getState().mergeFeedItems(feedId, items),
    {
      concurrency: settings.schedulerConcurrency,
      tickMs: settings.refreshTickSeconds * 1000,
      baseBackoffMs: settings.schedulerBaseBackoffMs,
      maxBackoffMs: settings.schedulerMaxBackoffMs,
      staggerMs: settings.schedulerStaggerMs,
    },
  );

  scheduler.onEvent((event) => {
    if (event.type === "batch_start") useStrataStore.getState().setBatchRefreshing(true);
    if (event.type === "batch_end") useStrataStore.getState().setBatchRefreshing(false);
    if (event.type === "feed_start" && event.feedId) useStrataStore.getState().setFeedRefreshing(event.feedId, true);
    if (event.type === "feed_success" && event.feedId) {
      useStrataStore.getState().setFeedRefreshing(event.feedId, false);
      useStrataStore.getState().setFeedError(event.feedId);
    }
    if (event.type === "feed_error" && event.feedId) {
      useStrataStore.getState().setFeedRefreshing(event.feedId, false);
      useStrataStore.getState().setFeedError(event.feedId, event.message ?? "Refresh failed");
    }
  });

  return {
    app: plugin.app,
    plugin,
    logger,
    stateService: new StateService(plugin, logger),
    cacheService: new CacheService(),
    mockAdapter: new MockAdapter(),
    rssAdapter,
    youtubeAdapter,
    discoveryService,
    scheduler,
    noteService: new NoteService(plugin.app),
    notificationsService: new NotificationsService(() => settings.suppressAllNotifications),
    opmlService: new OPMLService(),
    articlePreviewService: new ArticlePreviewService(),
  };
}
