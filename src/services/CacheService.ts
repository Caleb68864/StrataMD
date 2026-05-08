import type { FeedItem } from "../models/FeedItem";
import { openDatabase, IndexedDBUnavailableError } from "./storage/idbWrapper";

interface ArticleRecord { itemId: string; html: string }

export class CacheService {
  private db: IDBDatabase | null = null;
  private readonly dbName = "stratamd-cache";

  async open(): Promise<void> {
    this.db = await openDatabase(this.dbName);
  }

  async putItems(items: FeedItem[]): Promise<void> {
    if (!this.db) return;
    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction("items", "readwrite");
      const store = tx.objectStore("items");
      for (const i of items) store.put(i);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getItemsByFeed(feedId: string): Promise<FeedItem[]> {
    if (!this.db) return [];
    return await new Promise<FeedItem[]>((resolve, reject) => {
      const tx = this.db!.transaction("items", "readonly");
      const store = tx.objectStore("items");
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as FeedItem[]).filter((i) => i.feedId === feedId));
      req.onerror = () => reject(req.error);
    });
  }

  async putExtractedArticle(itemId: string, html: string): Promise<void> {
    if (!this.db) return;
    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction("articles", "readwrite");
      tx.objectStore("articles").put({ itemId, html } as ArticleRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getExtractedArticle(itemId: string): Promise<string | undefined> {
    if (!this.db) return undefined;
    return await new Promise<string | undefined>((resolve, reject) => {
      const tx = this.db!.transaction("articles", "readonly");
      const req = tx.objectStore("articles").get(itemId);
      req.onsuccess = () => resolve((req.result as ArticleRecord | undefined)?.html);
      req.onerror = () => reject(req.error);
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) return;
    await Promise.all(["items", "itemsByFeed", "articles"].map((name) => new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(name, "readwrite");
      tx.objectStore(name).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    })));
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}

export { IndexedDBUnavailableError };
