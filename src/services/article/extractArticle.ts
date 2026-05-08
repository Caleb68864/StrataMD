import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

export async function parseHtmlWithReadability(html: string, url: string): Promise<string | null> {
  const { document } = parseHTML(html);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (document as any).location = { href: url };
  const article = new Readability(document).parse();
  return article?.content ?? null;
}
