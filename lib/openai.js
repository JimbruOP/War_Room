// Server-side OpenAI helper. The API key lives ONLY here, read from the
// environment — it is never sent to the browser.
import OpenAI from "openai";

let client = null;

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env.local (see .env.local.example).");
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

// Run a chat completion constrained to a JSON schema (structured outputs),
// and return the parsed object. No regex cleanup, no parse failures.
export async function completeJson(prompt, jsonSchema, maxTokens = 1000) {
  const openai = getOpenAI();
  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_schema", json_schema: jsonSchema },
  });
  const text = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(text);
}
