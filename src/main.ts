import { Notice, Plugin } from "obsidian";
import { FeedIngestModal } from "./components/FeedIngestModal";
import { ImportReportModal } from "./components/ImportReportModal";
import { OpmlImportModal } from "./components/OpmlImportModal";
import { DEFAULT_SETTINGS, type StrataPluginSettings } from "./settings";
import { StrataSettingTab } from "./settingsTab";
import { createContainer, type Container } from "./services/Container";
import { YouTubeResolutionError } from "./services/adapters/YouTubeAdapter";
import { normalizeFeedUrl } from "./services/normalizeFeedUrl";
import { selectFilteredItems } from "./store/selectors";
import { useStrataStore } from "./store/useStrataStore";
import { STRATA_VIEW_TYPE, StrataDashboardView } from "./views/StrataDashboardView";
import "./styles.css";

export default class StrataMDPlugin extends Plugin {
  private container: Container | null = null;
  settings: StrataPluginSettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    await this.loadSettings();
    this.container = createContainer(this, this.settings);
    this.addSettingTab(new StrataSettingTab(this.app, this));

    this.registerView(
      STRATA_VIEW_TYPE,
      (leaf) =>
        new StrataDashboardView(leaf, {
          onSaveSelected: async () => this.saveSelectedItemAsNote(),
          onOpenOriginal: () => this.openSelectedOriginal(),
          onToggleStar: () => this.toggleSelectedStar(),
          onToggleRead: () => this.toggleSelectedRead(),
          loadPreview: (url, feedContent, summary) => this.loadPreview(url, feedContent, summary),
        }),
    );

    this.addCommand({ id: "open-dashboard", name: "Open StrataMD Dashboard", callback: () => this.activateView() });
    this.addCommand({ id: "add-feed-url", name: "StrataMD: Add Feed URL", callback: async () => this.openIngestModal() });
    this.addCommand({ id: "refresh-all-feeds", name: "StrataMD: Refresh All Feeds", callback: async () => this.refreshAllFeeds() });
    this.addCommand({ id: "import-opml", name: "StrataMD: Import OPML", callback: async () => this.openOpmlImportModal() });
    this.addCommand({ id: "next-item", name: "StrataMD: Select Next Item", callback: () => useStrataStore.getState().selectNextIn(this.getVisibleItemIds()) });
    this.addCommand({ id: "previous-item", name: "StrataMD: Select Previous Item", callback: () => useStrataStore.getState().selectPrevIn(this.getVisibleItemIds()) });
    this.addCommand({ id: "toggle-read", name: "StrataMD: Toggle Read/Unread", callback: () => this.toggleSelectedRead() });
    this.addCommand({ id: "mark-all-read", name: "StrataMD: Mark Visible Items Read", callback: () => this.markVisibleRead() });
    this.addCommand({ id: "toggle-star", name: "StrataMD: Toggle Star", callback: () => this.toggleSelectedStar() });
    this.addCommand({ id: "toggle-saved", name: "StrataMD: Toggle Saved", callback: () => this.toggleSelectedSaved() });
    this.addCommand({ id: "toggle-ignored", name: "StrataMD: Toggle Ignored", callback: () => this.toggleSelectedIgnored() });
    this.addCommand({ id: "save-selected-note", name: "StrataMD: Save Selected Item as Note", callback: async () => this.saveSelectedItemAsNote() });
    this.addCommand({ id: "jump-top", name: "StrataMD: Jump To First Item", callback: () => useStrataStore.getState().selectFirstIn(this.getVisibleItemIds()) });
    this.addCommand({ id: "jump-bottom", name: "StrataMD: Jump To Last Item", callback: () => useStrataStore.getState().selectLastIn(this.getVisibleItemIds()) });
    this.addCommand({ id: "open-original", name: "StrataMD: Open Original", callback: () => this.openSelectedOriginal() });
    this.addCommand({ id: "rebuild-cache", name: "StrataMD: Rebuild Cache", callback: async () => this.rebuildCache() });
    this.addCommand({ id: "toggle-compact", name: "StrataMD: Toggle Compact Mode", callback: () => useStrataStore.getState().toggleCompactMode() });
    this.addCommand({ id: "toggle-focus", name: "StrataMD: Toggle Focus Mode", callback: () => useStrataStore.getState().toggleDistractionFree() });

    this.addRibbonIcon("newspaper", "Open StrataMD Dashboard", () => this.activateView());

    await this.container.cacheService.open().catch(() => undefined);
    const hydrated = await this.container.stateService.load();
    useStrataStore.getState().hydrate(hydrated);

    if (hydrated.feeds.length === 0 && hydrated.items.length === 0) {
      const feed = await this.container.mockAdapter.resolve("https://example.com/feed");
      const demoItems = Array.from({ length: 80 }).map((_, idx) => ({
        id: `i-${idx + 1}`,
        feedId: feed.id,
        sourceType: "mock" as const,
        title: `Demo item ${idx + 1}`,
        url: `https://example.com/item-${idx + 1}`,
        published: new Date().toISOString(),
        summary: "This is scaffold data for the StrataMD dashboard while services are being implemented.",
        mediaType: idx % 3 === 0 ? ("video" as const) : ("article" as const),
      }));
      useStrataStore.getState().setFeeds([feed]);
      useStrataStore.getState().setItems(demoItems);
      useStrataStore.getState().selectItem(demoItems[0]?.id ?? null);
      this.persistStore();
    } else {
      useStrataStore.getState().selectItem(hydrated.items[0]?.id ?? null);
      await this.refreshAllFeeds();
    }

    this.container.scheduler.start(() => useStrataStore.getState().feeds);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  onunload(): void {
    if (!this.container) return;
    this.persistStore();
    this.container.scheduler.stop();
    this.container.cacheService.close();
    this.container.stateService.flush();
  }

  private persistStore(): void {
    if (!this.container) return;
    const s = useStrataStore.getState();
    this.container.stateService.save({
      feeds: s.feeds,
      items: s.items,
      userState: s.userState,
      uiState: {
        activeView: s.activeView,
        activeFeedId: s.activeFeedId,
        compactMode: s.compactMode,
        distractionFree: s.distractionFree,
      },
    });
  }

  private getVisibleItemIds(): string[] {
    return selectFilteredItems().map((it) => it.id);
  }

  private getSelectedItem() {
    const s = useStrataStore.getState();
    return s.selectedItemId ? s.items.find((i) => i.id === s.selectedItemId) ?? null : null;
  }

  private async refreshAllFeeds(): Promise<void> {
    if (!this.container) return;
    await this.container.scheduler.refreshAll(useStrataStore.getState().feeds);
    this.persistStore();
  }

  private toggleSelectedRead(): void {
    const item = this.getSelectedItem();
    if (!item) return;
    const readIds = useStrataStore.getState().userState.readIds;
    if (readIds.has(item.id)) useStrataStore.getState().markUnread(item.id);
    else useStrataStore.getState().markRead(item.id);
    this.persistStore();
  }

  private toggleSelectedStar(): void {
    const item = this.getSelectedItem();
    if (!item) return;
    useStrataStore.getState().toggleStar(item.id);
    this.persistStore();
  }

  private toggleSelectedSaved(): void {
    const item = this.getSelectedItem();
    if (!item) return;
    useStrataStore.getState().toggleSaved(item.id);
    this.persistStore();
  }

  private toggleSelectedIgnored(): void {
    const item = this.getSelectedItem();
    if (!item) return;
    useStrataStore.getState().toggleIgnored(item.id);
    this.persistStore();
  }

  private markVisibleRead(): void {
    const ids = this.getVisibleItemIds();
    useStrataStore.getState().markAllReadIn(ids);
    this.persistStore();
  }

  private openSelectedOriginal(): void {
    const item = this.getSelectedItem();
    if (!item) return;
    window.open(item.url, "_blank", "noopener,noreferrer");
  }

  private async saveSelectedItemAsNote(): Promise<void> {
    if (!this.container) return;
    const item = this.getSelectedItem();
    if (!item) return;
    const feed = useStrataStore.getState().feeds.find((f) => f.id === item.feedId);
    const path = await this.container.noteService.saveItem(item, feed);
    new Notice(`Saved: ${path}`);
  }

  private async loadPreview(url: string, feedContent?: string, summary?: string): Promise<{ html: string; source: string }> {
    if (!this.container) return { html: "<p>No preview available.</p>", source: "empty" };
    const result = await this.container.articlePreviewService.extract(url, feedContent, summary);
    return { html: result.html, source: result.source };
  }

  private async activateView(): Promise<void> {
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: STRATA_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  private async rebuildCache(): Promise<void> {
    if (!this.container) return;
    useStrataStore.getState().setItems([]);
    await this.container.cacheService.clearAll();
    await this.refreshAllFeeds();
    new Notice("StrataMD cache rebuilt.");
  }

  private openIngestModal(): void {
    const modal = new FeedIngestModal(this.app, async (payload) => {
      if (!this.container) return;
      let resolved;
      try {
        resolved = await this.container.discoveryService.resolve(payload.url);
      } catch (error) {
        if (error instanceof YouTubeResolutionError && payload.youtubeOverride) {
          const override = payload.youtubeOverride.startsWith("http")
            ? payload.youtubeOverride
            : `https://www.youtube.com/feeds/videos.xml?channel_id=${payload.youtubeOverride}`;
          resolved = await this.container.discoveryService.resolve(override);
        } else {
          throw error;
        }
      }
      const feed = {
        ...resolved,
        displayName: payload.displayName ?? resolved.displayName,
        category: payload.category ?? resolved.category,
      };
      useStrataStore.getState().upsertFeed(feed);
      await this.container.scheduler.refreshOne(feed);
      this.container.notificationsService.notifyNewItems(feed, 1);
      this.persistStore();
      new Notice(`Source added: ${feed.displayName}`);
    });
    modal.open();
  }

  private openOpmlImportModal(): void {
    const modal = new OpmlImportModal(this.app, async (payload) => {
      if (!this.container) return;
      let xml = payload.xmlText ?? "";
      if (!xml && payload.vaultPath) {
        const file = this.app.vault.getAbstractFileByPath(payload.vaultPath);
        if (!file) throw new Error(`File not found in vault: ${payload.vaultPath}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        xml = await this.app.vault.cachedRead(file as any);
      }

      const parsed = this.container.opmlService.parse(xml);
      let imported = 0;
      let skipped = 0;
      const errors = [...parsed.errors];
      const existing = new Set(useStrataStore.getState().feeds.map((f) => normalizeFeedUrl(f.url)));

      for (const entry of parsed.feeds) {
        try {
          const n = normalizeFeedUrl(entry.xmlUrl);
          if (existing.has(n)) {
            skipped += 1;
            continue;
          }

          const resolved = await this.container.discoveryService.resolve(entry.xmlUrl);
          const nr = normalizeFeedUrl(resolved.url);
          if (existing.has(nr)) {
            skipped += 1;
            continue;
          }

          const feed = {
            ...resolved,
            displayName: entry.title ?? resolved.displayName,
            category: entry.category ?? resolved.category,
          };
          useStrataStore.getState().upsertFeed(feed);
          existing.add(nr);
          imported += 1;
          this.container.notificationsService.notifyNewItems(feed, 1);
        } catch (error) {
          errors.push(`${entry.xmlUrl}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      await this.refreshAllFeeds();
      new Notice(`OPML import complete: ${imported} added, ${skipped} skipped${errors.length ? `, ${errors.length} errors` : ""}.`);
      if (errors.length > 0 || skipped > 0) {
        new ImportReportModal(this.app, { imported, skipped, errors }).open();
      }
    });
    modal.open();
  }
}
