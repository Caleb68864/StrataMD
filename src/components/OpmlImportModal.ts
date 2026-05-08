import { Modal, Setting } from "obsidian";

export interface OpmlImportPayload {
  xmlText?: string;
  vaultPath?: string;
}

export class OpmlImportModal extends Modal {
  private xmlText = "";
  private vaultPath = "";
  private errorEl: HTMLDivElement | null = null;

  constructor(app: Modal["app"], private readonly onSubmit: (payload: OpmlImportPayload) => Promise<void>) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Import OPML" });

    this.errorEl = contentEl.createDiv({ cls: "smd-error" });
    this.errorEl.hide();

    new Setting(contentEl)
      .setName("Vault path (optional)")
      .setDesc("Path to an .opml file inside your vault")
      .addText((text) => text.setPlaceholder("Feeds/subscriptions.opml").onChange((v) => (this.vaultPath = v.trim())));

    contentEl.createEl("p", { text: "Or paste OPML XML below:" });
    const area = contentEl.createEl("textarea");
    area.rows = 12;
    area.style.width = "100%";
    area.onchange = () => {
      this.xmlText = area.value.trim();
      this.clearError();
    };

    new Setting(contentEl)
      .addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((btn) =>
        btn
          .setCta()
          .setButtonText("Import")
          .onClick(async () => {
            if (!this.vaultPath && !this.xmlText) {
              this.setError("Provide a vault path or paste OPML XML.");
              return;
            }
            try {
              await this.onSubmit({ xmlText: this.xmlText || undefined, vaultPath: this.vaultPath || undefined });
              this.close();
            } catch (error) {
              const msg = error instanceof Error ? error.message : "Import failed";
              this.setError(msg);
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
