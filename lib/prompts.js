// Server-side prompt builders + JSON schemas. Ported from the prototype's
// Claude prompts, kept almost verbatim, now driving OpenAI structured outputs.

export function lensBlock(lens) {
  return `POLITICAL LENS (the client you work for):
- Candidate: ${lens.candidate}
- Party: ${lens.party}
- Constituency focus: ${lens.constituency}
- Allies (do NOT attack): ${lens.allies}
- Rivals (fair to attack): ${lens.rivals}
- Strategy notes: ${lens.notes}`;
}

// ---------- Analysis (risk / importance / posture / angles) ----------
export function buildAnalysisPrompt(lens, headline) {
  return `You are a sharp political communications strategist working for an Indian political candidate. Analyze the news item below.

${lensBlock(lens)}

NEWS ITEM:
"${headline}"

Rules:
- If the item involves an active tragedy or an ally, lean toward condolence or stay_silent and flag risk. If a rival's failure, attack is fair.
- "importance" MUST be an integer on a 0 to 100 scale (NOT 0 to 10), scoring how much this matters for THIS candidate specifically. A routine story is around 30, a major story for this candidate is 85 or above.
- Return EXACTLY 3 angles. Not 2, not 5.
- Be specific to the candidate's lens. Keep every reason to one short sentence.`;
}

export const ANALYSIS_SCHEMA = {
  name: "story_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      risk: { type: "string", enum: ["low", "medium", "high"] },
      risk_reason: {
        type: "string",
        description: "One short sentence on why (mention if it's an ally, a tragedy, etc.)",
      },
      importance: {
        type: "integer",
        description: "0-100, how much this matters for THIS candidate specifically",
      },
      posture: {
        type: "string",
        enum: ["attack", "align", "condolence", "celebrate", "stay_silent"],
      },
      posture_reason: { type: "string", description: "One short sentence" },
      angles: {
        type: "array",
        description: "Exactly 3 angles",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string", description: "2-4 word angle label" },
            line: { type: "string", description: "One sentence describing the angle" },
          },
          required: ["name", "line"],
        },
      },
    },
    required: ["risk", "risk_reason", "importance", "posture", "posture_reason", "angles"],
  },
};

// ---------- Statement generation (X + Facebook) ----------
export function buildGenerationPrompt(lens, headline, angle, posture, tone) {
  return `You are a political communications writer for ${lens.candidate} (${lens.party}).

${lensBlock(lens)}

NEWS: "${headline}"
CHOSEN ANGLE: ${angle.name} — ${angle.line}
POSTURE: ${posture}
TONE: ${tone}

Write TWO social posts. The writer's English is simple — use plain, warm, human words, not fancy vocabulary. No em-dashes. Sound like a real person, not AI. The "x" post MUST be under 280 characters. The "facebook" post is slightly longer, 3-5 sentences.`;
}

export const STATEMENT_SCHEMA = {
  name: "social_statement",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      x: { type: "string", description: "The tweet, under 280 characters" },
      facebook: { type: "string", description: "A slightly longer Facebook version, 3-5 sentences" },
    },
    required: ["x", "facebook"],
  },
};

// ---------- Instagram caption generation ----------
export function buildCaptionPrompt(lens, source, style) {
  return `You are a social media writer for ${lens.candidate} (${lens.party}), an Indian politician. Write Instagram caption options for a short video (reel).

PERSONA CONTEXT (use only for voice, warmth and values — do NOT force politics or attacks into a reel caption):
${lensBlock(lens)}

THE REEL / IDEA (what the video is about):
"${source}"

DESIRED FEEL: ${style || "warm and genuine"}

Write 4 caption options. Rules:
- Very simple, plain English. Short, common words only. These captions will be translated into Malayalam by a person, so avoid idioms, wordplay, rare words and anything that will not translate cleanly.
- No em-dashes. Sound like a real human being, warm and sincere, never like AI.
- Follow the reel's actual content first. Use the persona only for tone and values, not to turn it political.
- Each caption is 1 to 3 short sentences.
- Give 3 to 5 simple, relevant hashtags for each (English is fine).
- Make the 4 options genuinely different: one warm and emotional, one short and punchy, one that asks a question or invites people to engage, one a little inspirational.`;
}

export const CAPTION_SCHEMA = {
  name: "caption_options",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      captions: {
        type: "array",
        description: "Exactly 4 options",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            style: { type: "string", description: "2-3 word label, e.g. Warm, Punchy, Question, Inspiring" },
            text: { type: "string", description: "The caption in simple English" },
            hashtags: { type: "array", items: { type: "string" } },
          },
          required: ["style", "text", "hashtags"],
        },
      },
    },
    required: ["captions"],
  },
};

// ---------- Malayalam draft (optional, rough) ----------
export function buildTranslatePrompt(text) {
  return `Translate this Instagram caption into natural, simple Malayalam that a real native speaker would actually write. Keep it warm and human. Do not translate hashtags or names of people; leave those as they are. Keep it faithful but natural, not word for word.

CAPTION:
"${text}"`;
}

export const TRANSLATE_SCHEMA = {
  name: "malayalam_caption",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      malayalam: { type: "string", description: "The caption in Malayalam" },
    },
    required: ["malayalam"],
  },
};
