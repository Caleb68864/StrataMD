import type { App, TFile } from "obsidian";
import type { FeedItem } from "../models/FeedItem";
import type { FeedSource } from "../models/FeedSource";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export class NoteService {
  constructor(private readonly app: App) {}

  async saveItem(item: FeedItem, feed?: FeedSource): Promise<string> {
    const baseName = slugify(item.title) || item.id;
    const dir = "StrataMD Inbox";
    const path = await this.getAvailablePath(dir, `${baseName}.md`);
    const now = new Date().toISOString();
    const fm = [
      "---",
      `type: ${item.mediaType === "video" ? "youtube_note" : "article_note"}`,
      "status: inbox",
      `source: "${feed?.displayName ?? "Unknown"}"`,
      `url: "${item.url}"`,
      `category: "${feed?.category ?? ""}"`,
      "tags: []",
      `published: "${item.published}"`,
      `saved_at: "${now}"`,
      "---",
      "",
      `# ${item.title}`,
      "",
      item.summary ?? "",
      "",
      `[Open Original](${item.url})`,
      "",
    ].join("\n");
    await this.app.vault.create(path, fm);
    return path;
  }

  private async getAvailablePath(dir: string, name: string): Promise<string> {
    if (!this.app.vault.getAbstractFileByPath(dir)) {
      await this.app.vault.createFolder(dir);
    }
    const dot = name.lastIndexOf(".");
    const stem = dot === -1 ? name : name.slice(0, dot);
    const ext = dot === -1 ? "" : name.slice(dot);
    let i = 1;
    let candidate = `${dir}/${name}`;
    while (this.app.vault.getAbstractFileByPath(candidate)) {
      i += 1;
      candidate = `${dir}/${stem}-${i}${ext}`;
    }
    return candidate;
  }
}
