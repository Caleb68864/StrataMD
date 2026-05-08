export function normalizeFeedUrl(input: string): string {
  try {
    const url = new URL(input.trim());
    url.hash = "";
    if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
      url.port = "";
    }
    if (url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return input.trim();
  }
}
