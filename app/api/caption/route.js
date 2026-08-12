import { NextResponse } from "next/server";
import { completeJson } from "@/lib/openai";
import { buildCaptionPrompt, CAPTION_SCHEMA } from "@/lib/prompts";
import { srtToText } from "@/lib/srt";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { lens, source, style } = await req.json();
    const text = srtToText(source || "");
    if (!lens || !text.trim()) {
      return NextResponse.json({ error: "Missing lens or reel text." }, { status: 400 });
    }
    // Cap very long transcripts so cost stays sane.
    const trimmed = text.slice(0, 4000);
    const prompt = buildCaptionPrompt(lens, trimmed, style);
    const out = await completeJson(prompt, CAPTION_SCHEMA, 1200);
    out.captions = Array.isArray(out.captions) ? out.captions.slice(0, 4) : [];
    return NextResponse.json(out);
  } catch (err) {
    console.error("[/api/caption]", err);
    return NextResponse.json({ error: err.message || "Caption generation failed." }, { status: 500 });
  }
}
