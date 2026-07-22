// Diagnostic: checks every RSS feed for reachability, item count and freshness.
// Run with:  node scripts/probe-feeds.mjs
import { FEEDS, parseFeed } from "../lib/rss.js";

const now = Date.now();
let totalOk = 0;

for (const feed of FEEDS) {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WarRoom/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.log(`${feed.id.padEnd(22)} HTTP ${res.status}`);
      continue;
    }
    const rows = parseFeed(await res.text(), feed, now);
    if (!rows.length) {
      console.log(`${feed.id.padEnd(22)} 0 usable items`);
      continue;
    }
    const ages = rows
      .map((r) => (now - new Date(r.published_at).getTime()) / 3600000)
      .sort((a, b) => a - b);
    const median = ages[Math.floor(ages.length / 2)];
    totalOk += rows.length;
    console.log(
      `${feed.id.padEnd(22)} ${String(rows.length).padStart(3)} items | ` +
        `freshest ${ages[0].toFixed(1)}h | median ${median.toFixed(1)}h`
    );
    console.log(`    e.g. ${rows[0].headline.slice(0, 88)}`);
  } catch (e) {
    console.log(`${feed.id.padEnd(22)} ERROR ${e.message.slice(0, 50)}`);
  }
}
console.log(`\ntotal usable items across all feeds: ${totalOk}`);
