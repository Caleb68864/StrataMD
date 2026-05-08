export interface StrataPluginSettings {
  refreshTickSeconds: number;
  defaultFeedIntervalMin: number;
  schedulerConcurrency: number;
  schedulerStaggerMs: number;
  schedulerBaseBackoffMs: number;
  schedulerMaxBackoffMs: number;
  pruneAfterDays: number;
  suppressAllNotifications: boolean;
  devMocksEnabled: boolean;
  defaultCompactMode: boolean;
  defaultDistractionFree: boolean;
}

export const DEFAULT_SETTINGS: StrataPluginSettings = {
  refreshTickSeconds: 60,
  defaultFeedIntervalMin: 30,
  schedulerConcurrency: 4,
  schedulerStaggerMs: 200,
  schedulerBaseBackoffMs: 5000,
  schedulerMaxBackoffMs: 300000,
  pruneAfterDays: 30,
  suppressAllNotifications: false,
  devMocksEnabled: false,
  defaultCompactMode: false,
  defaultDistractionFree: false,
};
