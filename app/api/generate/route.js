import { NextResponse } from "next/server";
import { completeJson } from "@/lib/openai";
import { buildGenerationPrompt, STATEMENT_SCHEMA } from "@/lib/prompts";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { lens, headline, angle, posture, tone } = await req.json();
    if (!lens || !headline?.trim() || !angle) {
      return NextResponse.json({ error: "Missing lens, headline, or angle." }, { status: 400 });
    }
    const prompt = buildGenerationPrompt(lens, headline.trim(), angle, posture, tone);
    const output = await completeJson(prompt, STATEMENT_SCHEMA, 800);
    return NextResponse.json(output);
  } catch (err) {
    console.error("[/api/generate]", err);
    return NextResponse.json(
      { error: err.message || "Generation failed." },
      { status: 500 }
    );
  }
}
