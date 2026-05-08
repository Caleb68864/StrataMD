import { Modal } from "obsidian";

export class ImportReportModal extends Modal {
  constructor(
    app: Modal["app"],
    private readonly summary: { imported: number; skipped: number; errors: string[] },
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "OPML Import Report" });
    contentEl.createEl("p", {
      text: `Imported: ${this.summary.imported} | Skipped duplicates: ${this.summary.skipped} | Errors: ${this.summary.errors.length}`,
    });

    if (this.summary.errors.length > 0) {
      const list = contentEl.createEl("ul");
      for (const err of this.summary.errors) {
        list.createEl("li", { text: err });
      }
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
