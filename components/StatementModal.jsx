"use client";

import { useState } from "react";
import { Loader2, Send, Sparkles, X as XIcon } from "lucide-react";
import OutputBox from "./OutputBox";
import { TONES } from "@/lib/constants";
import { generateStatement } from "@/lib/api";
import { saveStatement, rateStory, isStoryId } from "@/lib/db";

export default function StatementModal({ data, lens, supabase, onClose }) {
  const { item, analysis } = data;
  const [chosenAngle, setChosenAngle] = useState(null);
  const [tone, setTone] = useState("emotional");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);
  const [copied, setCopied] = useState(null);

  async function generate() {
    setLoading(true);
    setOutput(null);
    try {
      const result = await generateStatement({
        lens,
        headline: item.headline,
        angle: chosenAngle,
        posture: analysis.posture,
        tone,
      });
      setOutput(result);
      // Record the draft so the team has a history of what was written and when.
      try {
        await saveStatement(supabase, {
          storyId: isStoryId(item.id) ? item.id : null,
          analysisId: analysis._id ?? null,
          headline: item.headline,
          angle: chosenAngle,
          tone,
          x: result.x,
          facebook: result.facebook,
        });
        // Strongest behavioural signal there is: they wrote a post about it.
        rateStory(supabase, { story: item, rating: "top", signal: "generated" }).catch(() => {});
      } catch {
        /* drafts are still shown even if the history write fails */
      }
    } catch (e) {
      setOutput({ error: true });
    } finally {
      setLoading(false);
    }
  }

  function copy(text, key) {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Generate statement">
        <div className="modal-head">
          <h3>
            <Send size={16} /> Generate statement
          </h3>
          <button className="x" onClick={onClose} aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>
        <p className="modal-quote">{item.headline}</p>

        <div className="field">
          <label>1 · Pick the angle</label>
          <div className="angle-picks">
            {analysis.angles.map((a, i) => (
              <button
                key={i}
                className={`angle-pick ${chosenAngle === a ? "on" : ""}`}
                onClick={() => setChosenAngle(a)}
              >
                <div className="angle-name">{a.name}</div>
                <div className="angle-line">{a.line}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>2 · Tone</label>
          <div className="tone-row">
            {TONES.map((t) => (
              <button
                key={t}
                className={`tone ${tone === t ? "on" : ""}`}
                onClick={() => setTone(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button className="gen-btn big" onClick={generate} disabled={!chosenAngle || loading}>
          {loading ? (
            <>
              <Loader2 size={16} className="spin" /> Writing…
            </>
          ) : (
            <>
              <Sparkles size={15} /> Write X + Facebook posts
            </>
          )}
        </button>

        {output && !output.error && (
          <div className="outputs">
            <OutputBox
              label="X (Twitter)"
              text={output.x}
              meta={`${output.x.length} / 280 chars`}
              over={output.x.length > 280}
              onCopy={() => copy(output.x, "x")}
              copied={copied === "x"}
            />
            <OutputBox
              label="Facebook"
              text={output.facebook}
              onCopy={() => copy(output.facebook, "fb")}
              copied={copied === "fb"}
            />
          </div>
        )}
        {output && output.error && (
          <div className="err-note">Couldn&apos;t generate — try again.</div>
        )}
      </div>
    </div>
  );
}
