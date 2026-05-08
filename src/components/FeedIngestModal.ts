import { Modal, Setting } from "obsidian";

export interface FeedIngestPayload {
  url: string;
  displayName?: string;
  category?: string;
  youtubeOverride?: string;
}

export class FeedIngestModal extends Modal {
  private url = "";
  private displayName = "";
  private category = "";
  private youtubeOverride = "";
  private youtubeOverrideEl: HTMLDivElement | null = null;
  private errorEl: HTMLDivElement | null = null;

  constructor(
    app: Modal["app"],
    private readonly onSubmit: (payload: FeedIngestPayload) => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Ingest Source URL" });

    this.errorEl = contentEl.createDiv({ cls: "smd-error" });
    this.errorEl.hide();

    new Setting(contentEl)
      .setName("URL")
      .setDesc("RSS, Atom, YouTube channel/playlist, or website URL")
      .addText((text) =>
        text.setPlaceholder("https://...").onChange((value) => {
          this.url = value.trim();
          this.clearError();
        }),
      );

    new Setting(contentEl)
      .setName("Display Name (optional)")
      .addText((text) =>
        text.setPlaceholder("Source name").onChange((value) => {
          this.displayName = value.trim();
        }),
      );

    new Setting(contentEl)
      .setName("Category (optional)")
      .addText((text) =>
        text.setPlaceholder("research, dev, security").onChange((value) => {
          this.category = value.trim();
        }),
      );

    this.youtubeOverrideEl = contentEl.createDiv();
    this.youtubeOverrideEl.hide();
    new Setting(this.youtubeOverrideEl)
      .setName("YouTube override (optional)")
      .setDesc("Channel ID or full feed URL if auto-resolution fails")
      .addText((text) =>
        text.setPlaceholder("UC... or https://www.youtube.com/feeds/videos.xml?...").onChange((value) => {
          this.youtubeOverride = value.trim();
        }),
      );

    new Setting(contentEl)
      .addButton((btn) =>
        btn.setButtonText("Cancel").onClick(() => {
          this.close();
        }),
      )
      .addButton((btn) =>
        btn
          .setCta()
          .setButtonText("Add Source")
          .onClick(async () => {
            if (!this.url || !/^https?:\/\//i.test(this.url)) {
              this.setError("Please enter a valid http(s) URL.");
              return;
            }
            try {
              await this.onSubmit({
                url: this.url,
                displayName: this.displayName || undefined,
                category: this.category || undefined,
                youtubeOverride: this.youtubeOverride || undefined,
              });
              this.close();
            } catch (error) {
              const message = error instanceof Error ? error.message : "Unable to ingest source.";
              if (message.toLowerCase().includes("channel id")) {
                this.youtubeOverrideEl?.show();
              }
              this.setError(message);
            }
          }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private setError(message: string): void {
    if (!this.errorEl) return;
    this.errorEl.setText(message);
    this.errorEl.show();
  }

  private clearError(): void {
    if (!this.errorEl) return;
    this.errorEl.hide();
    this.errorEl.setText("");
  }
}
