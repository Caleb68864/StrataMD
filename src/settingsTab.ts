import { App, PluginSettingTab, Setting } from "obsidian";
import type StrataMDPlugin from "./main";

export class StrataSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: StrataMDPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("Refresh tick (seconds)").addText((t) => t.setValue(String(this.plugin.settings.refreshTickSeconds)).onChange(async (v) => { this.plugin.settings.refreshTickSeconds = Number(v) || 60; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Default feed interval (minutes)").addText((t) => t.setValue(String(this.plugin.settings.defaultFeedIntervalMin)).onChange(async (v) => { this.plugin.settings.defaultFeedIntervalMin = Number(v) || 30; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Scheduler concurrency").addText((t) => t.setValue(String(this.plugin.settings.schedulerConcurrency)).onChange(async (v) => { this.plugin.settings.schedulerConcurrency = Number(v) || 4; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Scheduler stagger (ms)").addText((t) => t.setValue(String(this.plugin.settings.schedulerStaggerMs)).onChange(async (v) => { this.plugin.settings.schedulerStaggerMs = Number(v) || 200; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Suppress all notifications").addToggle((tog) => tog.setValue(this.plugin.settings.suppressAllNotifications).onChange(async (v) => { this.plugin.settings.suppressAllNotifications = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Default compact mode").addToggle((tog) => tog.setValue(this.plugin.settings.defaultCompactMode).onChange(async (v) => { this.plugin.settings.defaultCompactMode = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Default focus mode").addToggle((tog) => tog.setValue(this.plugin.settings.defaultDistractionFree).onChange(async (v) => { this.plugin.settings.defaultDistractionFree = v; await this.plugin.saveSettings(); }));
  }
}
