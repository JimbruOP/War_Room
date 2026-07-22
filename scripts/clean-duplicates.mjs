// One-off cleanup: removes stories whose headline duplicates an earlier row.
// These got in before dedupe-by-headline existed (Google News hands out a
// different redirect URL per query for the same article).
// Run:  node --env-file=.env.local scripts/clean-duplicates.mjs [--apply]
const APPLY = process.argv.includes("--apply");
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const rows = await (
  await fetch(
    `${URL}/rest/v1/stories?select=id,headline,source,published_at&order=published_at.asc&limit=2000`,
    { headers: h }
  )
).json();

const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "").slice(0, 120);

const keep = new Map();
const remove = [];
for (const r of rows) {
  const k = norm(r.headline);
  if (keep.has(k)) remove.push(r);
  else keep.set(k, r);
}

console.log(`scanned    : ${rows.length}`);
console.log(`unique     : ${keep.size}`);
console.log(`duplicates : ${remove.length}`);
remove.slice(0, 8).forEach((r) => console.log(`   - [${r.source}] ${r.headline.slice(0, 68)}`));

if (!remove.length) process.exit(0);
if (!APPLY) {
  console.log("\nDry run. Re-run with --apply to delete them.");
  process.exit(0);
}

// Delete in chunks. Analyses/statements cascade or null out via the FK rules.
let deleted = 0;
for (let i = 0; i < remove.length; i += 50) {
  const ids = remove.slice(i, i + 50).map((r) => r.id);
  const res = await fetch(`${URL}/rest/v1/stories?id=in.(${ids.join(",")})`, {
    method: "DELETE",
    headers: h,
  });
  if (!res.ok) {
    console.error("delete failed:", res.status, (await res.text()).slice(0, 200));
    break;
  }
  deleted += ids.length;
}
console.log(`\ndeleted ${deleted} duplicate stories.`);
