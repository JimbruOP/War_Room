import { NextResponse } from "next/server";
import { completeJson } from "@/lib/openai";
import { buildAnalysisPrompt, ANALYSIS_SCHEMA } from "@/lib/prompts";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { lens, headline } = await req.json();
    if (!lens || !headline?.trim()) {
      return NextResponse.json({ error: "Missing lens or headline." }, { status: 400 });
    }
    const prompt = buildAnalysisPrompt(lens, headline.trim());
    const analysis = await completeJson(prompt, ANALYSIS_SCHEMA, 1000);

    // Defensive normalisation — the UI's impact bar assumes 0-100 and the
    // angle grid is built for exactly 3, so never let bad values through.
    let importance = Number(analysis.importance) || 0;
    if (importance > 0 && importance <= 10) importance *= 10; // model used a 0-10 scale
    analysis.importance = Math.max(0, Math.min(100, Math.round(importance)));
    analysis.angles = Array.isArray(analysis.angles) ? analysis.angles.slice(0, 3) : [];

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[/api/analyze]", err);
    return NextResponse.json(
      { error: err.message || "Analysis failed." },
      { status: 500 }
    );
  }
}
