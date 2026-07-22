// RSS ingestion — replaces NewsData.io.
//
// Why: NewsData's free tier delays every article by at least 12 hours. Measured
// against 80 stored stories the fastest was 12.1h, median 19.5h, and not one
// arrived inside 12h. A rapid-response desk cannot run on that. These RSS feeds
// deliver the same stories within minutes, cost nothing, and have no quota.

import crypto from "crypto";

// Drop anything older than this — stops archive items flooding the feed.
export const MAX_AGE_HOURS = 48;

// Relevance filters for broad national feeds, which otherwise carry business
// and entertainment noise. Kerala feeds need no filter: it is all relevant.
const POLITICS_RE =
  /(modi|bjp|congress|parliament|minister|govt|government|election|court|protest|police|rahul|opposition|kerala|cabinet|bill|policy)/i;
const INDIA_RE = /(india|indian|delhi|modi|jaishankar)/i;

// Kerala place/party names, used to re-file national stories under Kerala.
const KERALA_HINT =
  /\b(kerala|keralam|alappuzha|alleppey|kochi|ernakulam|kozhikode|calicut|thiruvananthapuram|trivandrum|wayanad|malappuram|thrissur|kannur|kollam|palakkad|idukki|kottayam|pathanamthitta|kasaragod|sabarimala|pinarayi|satheesan|ldf|udf|cpm|iuml)\b/i;

export const FEEDS = [
  // ---- Kerala (the core desk) ----
  {
    id: "onmanorama-kerala",
    cat: "kerala",
    source: "Onmanorama",
    url: "https://www.onmanorama.com/kerala.feeds.onmrss.xml",
  },
  {
    id: "onmanorama-news",
    cat: "kerala",
    source: "Onmanorama",
    url: "https://www.onmanorama.com/news.feeds.onmrss.xml",
  },
  {
    id: "thehindu-kerala",
    cat: "kerala",
    source: "The Hindu",
    url: "https://www.thehindu.com/news/national/kerala/feeder/default.rss",
  },
  {
    id: "newindian-kerala",
    cat: "kerala",
    source: "New Indian Express",
    url: "https://www.newindianexpress.com/states/kerala/rssfeed/?id=170&getXmlFeed=true",
  },
  // Malayalam breaks first — measured at ~6 minutes from publication, versus
  // 12 hours minimum on NewsData. This is the fastest source in the whole list.
  // Query is "കേരളം" (Keralam), URL-encoded. Verified: 92 usable items.
  {
    id: "gnews-ml-kerala",
    cat: "kerala",
    source: "Google News (ML)",
    url: "https://news.google.com/rss/search?q=%E0%B4%95%E0%B5%87%E0%B4%B0%E0%B4%B3%E0%B4%82&hl=ml&gl=IN&ceid=IN:ml",
  },
  {
    id: "gnews-ml-top",
    cat: "kerala",
    source: "Google News (ML)",
    url: "https://news.google.com/rss?hl=ml&gl=IN&ceid=IN:ml",
  },

  // ---- National ----
  {
    id: "thehindu-national",
    cat: "indian",
    source: "The Hindu",
    url: "https://www.thehindu.com/news/national/feeder/default.rss",
    include: POLITICS_RE,
  },
  {
    id: "ndtv-top",
    cat: "indian",
    source: "NDTV",
    url: "https://feeds.feedburner.com/ndtvnews-top-stories",
    include: POLITICS_RE,
  },
  {
    id: "toi-top",
    cat: "indian",
    source: "Times of India",
    url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    include: POLITICS_RE,
  },
  {
    id: "indianexpress-india",
    cat: "indian",
    source: "Indian Express",
    url: "https://indianexpress.com/section/india/feed/",
    include: POLITICS_RE,
  },

  // ---- International / Sports ----
  {
    id: "thehindu-intl",
    cat: "intl",
    source: "The Hindu",
    url: "https://www.thehindu.com/news/international/feeder/default.rss",
    include: INDIA_RE,
  },
  {
    id: "toi-sports",
    cat: "sports",
    source: "Times of India",
    url: "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms",
  },
];

// ---------- parsing ----------
// Regexes are built with string concatenation, NOT template literals, so the
// backslashes survive intact.
function tagContent(block, tag) {
  const re = new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)<\\/" + tag + ">", "i");
  const m = block.match(re);
  return m ? stripCdata(m[1]).trim() : "";
}

function stripCdata(s) {
  return String(s)
    .replace(/^\s*<!\[CDATA\[/, "")
    .replace(/\]\]>\s*$/, "");
}

function decodeEntities(s) {
  return String(s)
    .replace(/<[^>]+>/g, "")
    // Numeric entities first: feeds double-encode, e.g. "J&#038;K" for "J&K".
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Atom feeds put the URL in <link href="...">, RSS puts it in the tag body.
function extractLink(block) {
  const rss = tagContent(block, "link");
  if (rss) return rss;
  const m = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return m ? m[1] : "";
}

function extractDate(block) {
  for (const tag of ["pubDate", "dc:date", "published", "updated"]) {
    const raw = tagContent(block, tag);
    if (!raw) continue;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export function urlHash(url) {
  const normalised = String(url || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
  return crypto.createHash("sha256").update(normalised).digest("hex");
}

export function parseFeed(xml, feed, now = Date.now()) {
  const blocks = [...xml.matchAll(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/g)].map(
    (m) => m[0]
  );

  const out = [];
  for (const block of blocks) {
    let title = decodeEntities(tagContent(block, "title"));
    const link = decodeEntities(extractLink(block));
    if (!title || !link) continue;

    // Google News appends " - Publisher" to every headline.
    let source = feed.source;
    const gnews = title.match(/^(.*?)\s+-\s+([^-]{2,40})$/);
    if (feed.id.startsWith("gnews") && gnews) {
      title = gnews[1].trim();
      source = gnews[2].trim();
    }

    const date = extractDate(block);
    if (!date) continue;
    const ageHours = (now - date.getTime()) / 3600000;
    if (ageHours > MAX_AGE_HOURS || ageHours < -2) continue; // stale, or clock-skewed future

    if (feed.include && !feed.include.test(title)) continue;

    out.push({
      url_hash: urlHash(link),
      category: KERALA_HINT.test(title) ? "kerala" : feed.cat,
      headline: title,
      source,
      url: link,
      published_at: date.toISOString(),
      is_manual: false,
    });
  }
  return out;
}

async function fetchFeed(feed) {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; WarRoom/1.0)" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseFeed(await res.text(), feed);
}

// Fetch every feed in parallel. One dead feed must not sink the refresh.
export async function fetchAllFeeds() {
  const settled = await Promise.allSettled(FEEDS.map(fetchFeed));

  const stories = [];
  const errors = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") stories.push(...r.value);
    else errors.push(`${FEEDS[i].id}: ${r.reason.message}`);
  });

  const seen = new Set();
  const deduped = stories.filter((s) => {
    if (seen.has(s.url_hash)) return false;
    seen.add(s.url_hash);
    return true;
  });

  deduped.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  return { stories: deduped, errors, feedCount: FEEDS.length };
}
