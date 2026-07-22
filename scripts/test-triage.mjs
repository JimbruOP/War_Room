// Scores real headlines from the database and reports token usage, so the
// ranking quality and the running cost can both be judged from evidence.
// Run:  node --env-file=.env.local scripts/test-triage.mjs [howMany]
import { triageStories, TRIAGE_MODEL } from "../lib/triage.js";
import { DEFAULT_LENS } from "../lib/constants.js";

const LIMIT = Number(process.argv[2] || 50);
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
    `${URL}/rest/v1/stories?select=id,headline,source&published_at=gte.${since}&order=published_at.desc&limit=${LIMIT}`,
    { headers: h }
  )
).json();

console.log(`Lens candidate : ${lens.candidate} (${lens.party})`);
console.log(`Model          : ${TRIAGE_MODEL}`);
console.log(`Scoring        : ${stories.length} headlines\n`);

const t0 = Date.now();
const { scored, errors, usage } = await triageStories(lens, stories);
const secs = ((Date.now() - t0) / 1000).toFixed(1);

const byId = Object.fromEntries(stories.map((s) => [s.id, s]));
scored.sort((a, b) => b.triage_score - a.triage_score);

console.log("=== TOP 12 ===");
scored.slice(0, 12).forEach((r) => {
  const s = byId[r.id];
  console.log(
    `  ${String(r.triage_score).padStart(3)}${r.is_tragedy ? " [TRAGEDY]" : "         "} ${s.headline.slice(0, 72)}`
  );
  console.log(`       ${r.triage_reason}`);
});

console.log("\n=== BOTTOM 6 (what gets pushed down) ===");
scored.slice(-6).forEach((r) => {
  const s = byId[r.id];
  console.log(`  ${String(r.triage_score).padStart(3)} ${s.headline.slice(0, 72)}`);
});

const tragedies = scored.filter((r) => r.is_tragedy);
console.log(`\ntragedies flagged: ${tragedies.length}`);
tragedies.slice(0, 4).forEach((r) => console.log(`   ${byId[r.id].headline.slice(0, 76)}`));

// Approximate gpt-4o-mini rates; verify against current OpenAI pricing.
const IN_RATE = 0.15 / 1_000_000;
const OUT_RATE = 0.6 / 1_000_000;
const cost = usage.promptTokens * IN_RATE + usage.completionTokens * OUT_RATE;
const perStory = cost / (scored.length || 1);

console.log(`\n=== COST ===`);
console.log(`  took            : ${secs}s`);
console.log(`  prompt tokens   : ${usage.promptTokens}`);
console.log(`  output tokens   : ${usage.completionTokens}`);
console.log(`  this run        : $${cost.toFixed(5)}`);
console.log(`  per story       : $${perStory.toFixed(6)}`);
console.log(`  at 400 new stories/day: $${(perStory * 400).toFixed(4)}/day  (~$${(perStory * 400 * 30).toFixed(2)}/month)`);
if (errors.length) console.log("\nerrors:", errors);
