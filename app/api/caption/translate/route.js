import { NextResponse } from "next/server";
import { completeJson } from "@/lib/openai";
import { buildTranslatePrompt, TRANSLATE_SCHEMA } from "@/lib/prompts";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "Nothing to translate." }, { status: 400 });
    }
    const out = await completeJson(buildTranslatePrompt(text.trim()), TRANSLATE_SCHEMA, 700);
    return NextResponse.json(out);
  } catch (err) {
    console.error("[/api/caption/translate]", err);
    return NextResponse.json({ error: err.message || "Translation failed." }, { status: 500 });
  }
}
