import { XMLParser } from "fast-xml-parser";

export interface ParsedOpmlOutline {
  title?: string;
  xmlUrl: string;
  htmlUrl?: string;
  category?: string;
}

export interface OpmlParseResult {
  feeds: ParsedOpmlOutline[];
  errors: string[];
}

export class OPMLService {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    processEntities: false,
    trimValues: true,
  });

  parse(xml: string): OpmlParseResult {
    const errors: string[] = [];
    const feeds: ParsedOpmlOutline[] = [];
    let parsed: any;

    try {
      parsed = this.parser.parse(xml);
    } catch {
      return { feeds: [], errors: ["Invalid OPML/XML file"] };
    }

    const body = parsed?.opml?.body;
    if (!body) return { feeds: [], errors: ["Missing OPML body"] };

    const outlines = this.flattenOutlines(body.outline);
    for (const outline of outlines) {
      const xmlUrl = this.asString(outline.xmlUrl);
      if (!xmlUrl) continue;
      feeds.push({
        title: this.asString(outline.title) ?? this.asString(outline.text),
        xmlUrl,
        htmlUrl: this.asString(outline.htmlUrl),
        category: this.asString(outline.category),
      });
    }

    if (feeds.length === 0) errors.push("No feed entries found in OPML.");
    return { feeds, errors };
  }

  private flattenOutlines(value: unknown): Record<string, unknown>[] {
    const roots = Array.isArray(value) ? value : value ? [value] : [];
    const output: Record<string, unknown>[] = [];
    const visit = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const rec = node as Record<string, unknown>;
      output.push(rec);
      const child = rec.outline;
      if (Array.isArray(child)) child.forEach(visit);
      else if (child) visit(child);
    };
    roots.forEach(visit);
    return output;
  }

  private asString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
  }
}
