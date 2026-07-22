"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  EyeOff,
  Flame,
  Gauge,
  Loader2,
  Send,
  Trash2,
} from "lucide-react";
import RiskTag from "./RiskTag";
import PostureTag from "./PostureTag";

export default function StoryCard({
  item,
  analysis,
  isLoading,
  onAssess,
  onGenerate,
  onRemove,
}) {
  // Assessed cards start collapsed. Previously every assessment stayed open
  // forever once it reloaded from the database, which buried the feed.
  const [open, setOpen] = useState(false);
  const assessed = analysis && !analysis.error;

  return (
    <article className={`card ${assessed ? "card-done" : ""}`}>
      <div className="card-top">
        <span className="src">{item.source}</span>
        <span className="dot">·</span>
        <span className="time">{item.time}</span>
        {item.is_tragedy && <span className="flag-tragedy">tragedy</span>}
        {item.triage_score != null && !assessed && (
          <span className="triage" title={item.triage_reason || ""}>
            {item.triage_score}
          </span>
        )}
        {item.risk && !analysis && <RiskTag risk={item.risk} mini />}
        {onRemove && (
          <button className="card-x" onClick={() => onRemove(item)} aria-label="Remove this entry">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <p className="headline">{item.headline}</p>

      {item.url && (
        <a
          className="src-link"
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Read the full report at ${item.source} (opens in a new tab)`}
        >
          <ExternalLink size={12} /> Read full report on {item.source}
        </a>
      )}

      {!analysis && !isLoading && (
        <button className="assess-btn" onClick={() => onAssess(item)}>
          <Gauge size={15} /> Assess this story <ChevronRight size={14} />
        </button>
      )}
      {isLoading && (
        <div className="loading-row">
          <Loader2 size={16} className="spin" /> Reading the room…
        </div>
      )}

      {assessed && (
        <div className="analysis">
          {/* Always-visible summary. Click to open the full detail. */}
          <button
            className="summary-row"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            <RiskTag risk={analysis.risk} reason={analysis.risk_reason} />
            <div className="imp">
              <Flame size={13} />
              <span>Impact {analysis.importance}</span>
              <div className="imp-bar">
                <div className="imp-fill" style={{ width: `${analysis.importance}%` }} />
              </div>
            </div>
            <PostureTag posture={analysis.posture} reason={analysis.posture_reason} />
            <span className="summary-toggle">
              {open ? "Hide" : "Angles"}
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>

          {open && (
            <div className="analysis-body">
              <div className="angles">
                {analysis.angles.map((a, i) => (
                  <div key={i} className="angle">
                    <div className="angle-name">{a.name}</div>
                    <div className="angle-line">{a.line}</div>
                  </div>
                ))}
              </div>

              {analysis.posture !== "stay_silent" ? (
                <button className="gen-btn" onClick={() => onGenerate({ item, analysis })}>
                  <Send size={14} /> Generate statement (X + Facebook)
                </button>
              ) : (
                <div className="silent-note">
                  <EyeOff size={14} /> Recommendation: stay silent on this one.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {analysis && analysis.error && (
        <div className="err-note">Couldn&apos;t analyze — try again.</div>
      )}
    </article>
  );
}
