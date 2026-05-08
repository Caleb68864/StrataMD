import { performance } from "node:perf_hooks";

function makeItems(count, feedCount) {
  return Array.from({ length: count }).map((_, i) => ({
    id: `item-${i}`,
    feedId: `feed-${i % feedCount}`,
    sourceType: "rss",
    title: `Title ${i} React performance`,
    url: `https://example.com/${i}`,
    published: new Date().toISOString(),
    summary: `Summary ${i}`,
    mediaType: i % 8 === 0 ? "video" : "article",
  }));
}

function runSearch(items, query) {
  const q = query.toLowerCase();
  return items.filter((it) => (it.title + " " + (it.summary ?? "")).toLowerCase().includes(q));
}

const feeds = 120;
const items = makeItems(5000, feeds);

const t0 = performance.now();
const res = runSearch(items, "react");
const t1 = performance.now();

const searchMs = t1 - t0;
console.log(`benchmark.feeds=${feeds}`);
console.log(`benchmark.items=${items.length}`);
console.log(`benchmark.search_ms=${searchMs.toFixed(2)}`);
console.log(`benchmark.search_results=${res.length}`);

if (searchMs > 150) {
  console.error("Benchmark failed: search exceeds 150ms target.");
  process.exit(1);
}

console.log("Benchmark OK");
