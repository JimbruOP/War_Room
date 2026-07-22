// NewsData.io integration: fetch → normalise → dedupe.
// Server-side only (uses NEWSDATA_API_KEY).

import crypto from "crypto";

const NEWSDATA_ENDPOINT = "https://newsdata.io/api/1/latest";

// NewsData's free tier caps the search parameter at 100 characters. Enforced
// by assertQueryLimits() below so an over-long query fails loudly here rather
// than silently returning nothing in production.
export const MAX_Q_LENGTH = 100;

// We search qInTitle, not q. `q` searches the full article body, which meant a
// Delhi protest story mentioning "Kerala" once in paragraph nine matched
// "Kerala AND protest". Title-only search fixed the precision problem.

// Kerala place/party names used to re-file national tragedy stories under the
// Kerala tab (a Wayanad landslide should not sit under "Indian Politics").
const KERALA_HINT =
  /\b(kerala|alappuzha|alleppey|kochi|ernakulam|kozhikode|calicut|thiruvananthapuram|trivandrum|wayanad|malappuram|thrissur|kannur|kollam|palakkad|idukki|kottayam|pathanamthitta|kasaragod|munnar|sabarimala|pinarayi|ldf|udf)\b/i;

// Seven queries, each mapped to a UI category tab. Four map to "kerala"
// because that is the core of this desk and one query cannot cover it
// (each query returns only 10 articles, so they must not compete).
// 7 queries x 24 hourly runs = 168 NewsData credits/day (free tier = 200).
// Malayalam is included on Kerala/India queries because local political news
// breaks in Malayalam hours before the English versions appear.
// tier "core"  -> the Kerala desk. Refreshed hourly.
// tier "wide"  -> national/world/sport. Refreshed every 6 hours.
// Split because 8 queries hourly would cost 192 of the 200 free daily
// credits, leaving nothing for manual refreshes. This costs 132/day.
export const FEED_QUERIES = [
  {
    id: "kerala-politics",
    cat: "kerala",
    tier: "core",
    // Party abbreviations and leader names are inherently Kerala, so they need
    // no "Kerala AND" prefix — that is what makes this fit in 100 chars.
    params: {
      qInTitle: `Pinarayi OR Satheesan OR LDF OR UDF OR CPM OR IUML OR Vizhinjam OR Munambam OR "Kerala govt"`,
      country: "in",
      language: "en,ml",
    },
  },
  {
    id: "kerala-general",
    cat: "kerala",
    tier: "core",
    // Governance and accountability stories: courts, police, protests, probes.
    params: {
      qInTitle: `Kerala AND (minister OR police OR court OR protest OR strike OR probe)`,
      country: "in",
      language: "en,ml",
    },
  },
  {
    id: "kerala-ownside",
    cat: "kerala",
    tier: "core",
    // Our own side: the candidate by name, plus Kerala BJP leadership. A war
    // room has to know the moment its own candidate or party is in the news,
    // and this is seat-independent so it survives whatever constituency lands.
    // (Coastal/Dheevara terms were tested for this slot and dropped: Kerala
    // coastal news returns ~2 stories on title search, so it did not earn a
    // query. Vizhinjam and Munambam moved into kerala-politics instead.)
    params: {
      // Names MUST be quoted phrases. Bare "Chandrasekhar" matched an ex-Cabinet
      // Secretary and an astrophysicist before this was fixed.
      qInTitle: `"Shoba Surendran" OR "Kerala BJP" OR "BJP Kerala" OR "Rajeev Chandrasekhar"`,
      country: "in",
      language: "en,ml",
    },
  },
  {
    id: "kerala-community",
    cat: "kerala",
    tier: "core",
    // Temple/community affairs — the consolidation plank in the lens.
    params: {
      qInTitle: `Sabarimala OR Ayyappa OR Devaswom OR (Kerala AND temple)`,
      country: "in",
      language: "en,ml",
    },
  },
  {
    id: "tragedy-india",
    cat: "indian",
    tier: "core",
    autoKerala: true, // re-file under the Kerala tab when the headline is Kerala
    // Its own query on purpose: the risk engine's main job is to stop an attack
    // post during an active tragedy, so these must never lose a result slot.
    // No "Kerala AND" — headlines say "Wayanad landslide", never "Kerala landslide".
    params: {
      qInTitle: `landslide OR flood OR drowned OR "death toll" OR cyclone OR blast`,
      country: "in",
      language: "en,ml",
    },
  },
  {
    id: "indian-politics",
    cat: "indian",
    tier: "wide",
    params: {
      qInTitle: `Modi OR BJP OR Congress OR Parliament OR "Lok Sabha"`,
      category: "politics",
      country: "in",
      language: "en,ml",
    },
  },
  {
    id: "international",
    cat: "intl",
    tier: "wide",
    // India's global standing — celebrate/align material.
    params: {
      qInTitle: `India AND (summit OR diplomacy OR global OR bilateral OR trade OR UN)`,
      category: "world",
      language: "en",
    },
  },
  {
    id: "sports",
    cat: "sports",
    tier: "wide",
    params: {
      qInTitle: `(India OR Kerala) AND (cricket OR football OR medal OR Olympics)`,
      category: "sports",
      country: "in",
      language: "en,ml",
    },
  },
];

// ---------------------------------------------------------------------------
// PARKED: hyperlocal constituency query.
// The seat is not confirmed yet, so this is intentionally NOT in FEED_QUERIES.
// Once a constituency is settled, drop the matching entry into FEED_QUERIES as
// a "core" query (costs 24 credits/day) and swap the place names to suit.
// Keep it under 100 characters.
//
//   Alappuzha: `Alappuzha OR Alleppey OR Kuttanad OR Cherthala OR Ambalappuzha`   (61c)
//   Thrissur:  `Thrissur OR Chalakudy OR Irinjalakuda OR Guruvayur OR Kodungallur` (64c)
//   Kollam:    `Kollam OR Karunagappally OR Kottarakkara OR Punalur OR Chathannoor` (66c)
//
// Note: title-only search on a single district returns low volume (3-5 stories),
// so expect relevance rather than quantity from whichever one you enable.
// ---------------------------------------------------------------------------
export const CONSTITUENCY_QUERY_EXAMPLES = {
  alappuzha: `Alappuzha OR Alleppey OR Kuttanad OR Cherthala OR Ambalappuzha`,
  thrissur: `Thrissur OR Chalakudy OR Irinjalakuda OR Guruvayur OR Kodungallur`,
  kollam: `Kollam OR Karunagappally OR Kottarakkara OR Punalur OR Chathannoor`,
};

export function queriesForTier(tier) {
  if (!tier || tier === "all") return FEED_QUERIES;
  return FEED_QUERIES.filter((f) => f.tier === tier);
}

// Fail fast if a query breaks the free-tier limit.
export function assertQueryLimits() {
  const bad = FEED_QUERIES.filter(
    (f) => (f.params.qInTitle || f.params.q || "").length > MAX_Q_LENGTH
  ).map((f) => `${f.id} (${(f.params.qInTitle || f.params.q).length} chars)`);
  if (bad.length) {
    throw new Error(`NewsData query exceeds ${MAX_Q_LENGTH} chars: ${bad.join(", ")}`);
  }
}

// Stable dedupe key: the article URL, normalised then hashed.
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

async function fetchCategory({ id, cat, params, autoKerala }, apiKey) {
  const qs = new URLSearchParams({ apikey: apiKey, ...params });
  const res = await fetch(`${NEWSDATA_ENDPOINT}?${qs}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`NewsData "${id}" failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  if (json.status !== "success") {
    throw new Error(`NewsData "${id}" error: ${json.results?.message || json.status}`);
  }

  return (json.results || [])
    .filter((a) => a.title && a.link)
    .map((a) => ({
      url_hash: urlHash(a.link),
      category: autoKerala && KERALA_HINT.test(a.title) ? "kerala" : cat,
      headline: a.title.trim(),
      source: a.source_name || a.source_id || "Unknown",
      url: a.link,
      published_at: a.pubDate ? new Date(a.pubDate.replace(" ", "T") + "Z").toISOString() : null,
      is_manual: false,
    }));
}

// Fetch every category. One failing category must not sink the whole refresh,
// so failures are collected and reported rather than thrown.
export async function fetchAllCategories(apiKey, tier = "all") {
  if (!apiKey) throw new Error("NEWSDATA_API_KEY is not set.");
  assertQueryLimits();

  const queries = queriesForTier(tier);
  const settled = await Promise.allSettled(
    queries.map((q) => fetchCategory(q, apiKey))
  );

  const stories = [];
  const errors = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") stories.push(...r.value);
    else errors.push(`${queries[i].id}: ${r.reason.message}`);
  });

  // Dedupe across categories (the same story can match two queries).
  const seen = new Set();
  const deduped = stories.filter((s) => {
    if (seen.has(s.url_hash)) return false;
    seen.add(s.url_hash);
    return true;
  });

  return { stories: deduped, errors };
}
