// Automatic triage: score every incoming headline 0-100 against the political
// lens so the feed can rank by relevance instead of clock time.
//
// This is deliberately NOT the full analysis. It reads a headline only, returns
// a number and one short reason, and runs headlines in batches so the cost per
// story stays tiny. The full risk/posture/angles analysis still happens on
// demand when someone clicks "Assess this story".

// Explicit .js extensions so this module also runs under plain Node ESM
// (scripts/test-triage.mjs), not just through the Next.js bundler.
import { getOpenAI } from "./openai.js";
import { lensBlock } from "./prompts.js";

export const TRIAGE_MODEL = process.env.OPENAI_TRIAGE_MODEL || "gpt-4o-mini";
export const TRIAGE_BATCH_SIZE = 25;
// How many batches run at once. 4 x 25 = 100 headlines in flight.
export const TRIAGE_CONCURRENCY = 4;

const TRIAGE_SCHEMA = {
  name: "triage_scores",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      scores: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            i: { type: "integer", description: "The index number given in the list" },
            score: { type: "integer", description: "0-100 relevance to this candidate" },
            tragedy: {
              type: "boolean",
              description: "True if this is an active tragedy, disaster or death",
            },
            why: { type: "string", description: "Max 8 words on why it scored that" },
            headline_en: {
              type: "string",
              description:
                "If the headline is in Malayalam (or any non-English script), a literal plain-English translation of it. If it is already in English, an empty string.",
            },
          },
          required: ["i", "score", "tragedy", "why", "headline_en"],
        },
      },
    },
    required: ["scores"],
  },
};

// Turns the team's past ratings into few-shot examples. This is what makes the
// ranker learn their judgement instead of following a generic guide.
export function examplesBlock(examples) {
  if (!examples?.top?.length && !examples?.ignore?.length) return "";

  const fmt = (rows) => rows.map((h) => `- ${h}`).join("\n");
  let out = `\nHOW THIS TEAM ACTUALLY RATES (learn from these real judgements — they OVERRIDE the generic guide below where they disagree):\n`;
  if (examples.top?.length) {
    out += `\nThey marked these TOP PRIORITY:\n${fmt(examples.top)}\n`;
  }
  if (examples.ignore?.length) {
    out += `\nThey marked these IGNORE:\n${fmt(examples.ignore)}\n`;
  }
  return out;
}

function buildPrompt(lens, headlines, examples) {
  const list = headlines.map((h, i) => `${i}. ${h}`).join("\n");
  return `You are triaging a news feed for an Indian political candidate's rapid-response team. For EACH headline, score how much it matters to THIS candidate.

${lensBlock(lens)}
${examplesBlock(examples)}
SCORING GUIDE (0-100):
- 90-100: directly about the candidate, their party, or a rival's major failure they can attack
- 70-89: significant state/national politics they could credibly comment on
- 40-69: relevant background, or a story affecting their voter base
- 10-39: general news, weak connection to this candidate
- 0-9: irrelevant (celebrity gossip, product launches, foreign sport, listicles)

Also set "tragedy" true for any active disaster, accident, death or attack. These matter even at a low score, because the team must know not to post attacks during them.

For "headline_en": if the headline contains ANY Malayalam text, you MUST give a faithful, literal English translation of the whole headline — just the title translated as-is, not a summary or explanation. Never leave it empty when there is Malayalam in the headline. If the headline is already entirely in English, return an empty string "".

Return one entry per headline, using the SAME index number shown.

HEADLINES:
${list}`;
}

async function scoreBatch(lens, headlines, examples) {
  const openai = getOpenAI();
  const res = await openai.chat.completions.create({
    model: TRIAGE_MODEL,
    // Higher than before: each entry now also carries an English translation.
    max_tokens: 6000,
    messages: [{ role: "user", content: buildPrompt(lens, headlines, examples) }],
    response_format: { type: "json_schema", json_schema: TRIAGE_SCHEMA },
  });

  const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{"scores":[]}');
  const usage = res.usage || {};

  const out = new Array(headlines.length).fill(null);
  for (const row of parsed.scores || []) {
    if (row.i >= 0 && row.i < headlines.length) {
      // Only headlines that actually contain Malayalam script get a translation.
      // This deterministically drops the cases where the model echoes an
      // English headline back as its own "translation".
      const isMalayalam = /[ഀ-ൿ]/.test(headlines[row.i] || "");
      const en = isMalayalam
        ? String(row.headline_en || "").trim().slice(0, 300) || null
        : null;
      out[row.i] = {
        score: Math.max(0, Math.min(100, Math.round(Number(row.score) || 0))),
        tragedy: Boolean(row.tragedy),
        why: String(row.why || "").slice(0, 120),
        headline_en: en,
      };
    }
  }
  return { results: out, usage };
}

// Dedicated, single-purpose translation. Used as a fallback for the few
// feed-shown (>=80) headlines where the combined triage pass returned an empty
// translation — a single, focused task the model follows far more reliably than
// translating-while-scoring 25 at a time.
const TRANSLATE_SCHEMA = {
  name: "headline_translations",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            i: { type: "integer" },
            en: { type: "string", description: "Literal English translation of the headline" },
          },
          required: ["i", "en"],
        },
      },
    },
    required: ["items"],
  },
};

export async function translateHeadlines(headlines) {
  if (!headlines?.length) return [];
  const openai = getOpenAI();
  const list = headlines.map((h, i) => `${i}. ${h}`).join("\n");
  const res = await openai.chat.completions.create({
    model: TRIAGE_MODEL,
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `Translate each Malayalam news headline below into faithful, literal English — just the title as it is, not a summary. Return one entry per headline using the SAME index number.\n\n${list}`,
      },
    ],
    response_format: { type: "json_schema", json_schema: TRANSLATE_SCHEMA },
  });
  const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{"items":[]}');
  const out = new Array(headlines.length).fill(null);
  for (const row of parsed.items || []) {
    if (row.i >= 0 && row.i < headlines.length) {
      out[row.i] = String(row.en || "").trim().slice(0, 300) || null;
    }
  }
  return out;
}

// Scores an array of { id, headline }. Returns scored rows plus token usage,
// so cost can actually be measured rather than guessed at.
export async function triageStories(lens, stories, examples) {
  const scored = [];
  const errors = [];
  let promptTokens = 0;
  let completionTokens = 0;

  // Split into batches, then run several batches at once. Sequentially this
  // took ~0.3s per headline, so 200 stories would have blown the 60s serverless
  // limit. Concurrency is capped so we don't trip OpenAI rate limits.
  const batches = [];
  for (let i = 0; i < stories.length; i += TRIAGE_BATCH_SIZE) {
    batches.push(stories.slice(i, i + TRIAGE_BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i += TRIAGE_CONCURRENCY) {
    const wave = batches.slice(i, i + TRIAGE_CONCURRENCY);
    const settled = await Promise.allSettled(
      wave.map((batch) => scoreBatch(lens, batch.map((s) => s.headline), examples))
    );

    settled.forEach((res, k) => {
      const batch = wave[k];
      if (res.status === "rejected") {
        errors.push(`triage batch ${i + k}: ${res.reason.message}`);
        return;
      }
      const { results, usage } = res.value;
      promptTokens += usage.prompt_tokens || 0;
      completionTokens += usage.completion_tokens || 0;
      results.forEach((r, j) => {
        if (!r) return;
        scored.push({
          id: batch[j].id,
          triage_score: r.score,
          triage_reason: r.why,
          is_tragedy: r.tragedy,
          headline_en: r.headline_en,
          triaged_at: new Date().toISOString(),
        });
      });
    });
  }

  return {
    scored,
    errors,
    usage: { promptTokens, completionTokens, model: TRIAGE_MODEL },
  };
}
