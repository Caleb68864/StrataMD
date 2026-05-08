import { requestUrl } from "obsidian";
import sanitizeHtml from "sanitize-html";

export interface ArticlePreviewResult {
  html: string;
  source: "readability" | "feed_content" | "summary" | "empty";
}

export class ArticlePreviewService {
  async extract(url: string, feedContent?: string, summary?: string): Promise<ArticlePreviewResult> {
    try {
      const response = await requestUrl({ url });
      const html = response.text;
      const { parseHtmlWithReadability } = await import("./article/extractArticle");
      const extracted = await parseHtmlWithReadability(html, url);
      if (extracted) {
        return { html: this.sanitize(extracted), source: "readability" };
      }
    } catch {
      // fall through
    }

    if (feedContent?.trim()) {
      return { html: this.sanitize(feedContent), source: "feed_content" };
    }
    if (summary?.trim()) {
      return { html: this.sanitize(`<p>${summary}</p>`), source: "summary" };
    }
    return { html: "<p>No preview available.</p>", source: "empty" };
  }

  private sanitize(input: string): string {
    return sanitizeHtml(input, {
      allowedTags: [
        "p", "a", "img", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code",
        "ul", "ol", "li", "strong", "em", "b", "i", "hr", "br", "table", "thead", "tbody", "tr", "th", "td",
      ],
      allowedAttributes: {
        a: ["href", "target", "rel"],
        img: ["src", "alt", "title", "width", "height", "loading"],
        '*': ["class"],
      },
      allowedSchemes: ["http", "https", "mailto"],
    });
  }
}
