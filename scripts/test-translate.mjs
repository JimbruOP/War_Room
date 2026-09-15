// Pulls recent headlines and shows the English translation triage produces.
// Run:  node --env-file=.env.local scripts/test-translate.mjs [howMany]
import { triageStories } from "../lib/triage.js";
import { DEFAULT_LENS } from "../lib/constants.js";

const LIMIT = Number(process.argv[2] || 60);
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const lensRows = await (
  await fetch(`${URL}/rest/v1/political_lens?select=*&limit=1`, { headers: h })
).json();
const lens = lensRows[0] || DEFAULT_LENS;

const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
const stories = await (
  await fetch(
    `${URL}/rest/v1/stories?select=id,headline&published_at=gte.${since}&order=published_at.desc&limit=${LIMIT}`,
    { headers: h }
  )
).json();

const byId = Object.fromEntries(stories.map((s) => [s.id, s]));
const { scored, errors } = await triageStories(lens, stories);

// Malayalam Unicode block, to prove detection worked.
const hasMalayalam = (s) => /[ഀ-ൿ]/.test(s);

const ml = scored.filter((r) => hasMalayalam(byId[r.id].headline));
console.log(`\n${ml.length} of ${scored.length} headlines are Malayalam\n`);

console.log("=== MALAYALAM HEADLINES → TRANSLATION (score) ===");
ml.sort((a, b) => b.triage_score - a.triage_score);
for (const r of ml) {
  const shown = r.triage_score >= 80 ? "SHOWN in feed" : "hidden (<80)";
  console.log(`\n[${r.triage_score}] ${shown}`);
  console.log(`  ML: ${byId[r.id].headline}`);
  console.log(`  EN: ${r.headline_en || "(!! no translation)"}`);
}

// Confirm English headlines get NO translation (empty).
const enWithTx = scored.filter(
  (r) => !hasMalayalam(byId[r.id].headline) && r.headline_en
);
console.log(`\n=== English headlines that wrongly got a translation: ${enWithTx.length} ===`);
enWithTx.slice(0, 5).forEach((r) => console.log(`  ${byId[r.id].headline} -> ${r.headline_en}`));

if (errors.length) console.log("\nerrors:", errors);
