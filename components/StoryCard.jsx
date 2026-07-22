"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  EyeOff,
  Flame,
  Gauge,
  Loader2,
  Send,
  StickyNote,
  Trash2,
} from "lucide-react";
import RiskTag from "./RiskTag";
import PostureTag from "./PostureTag";

const RATE_OPTIONS = [
  { id: "top", label: "Top", hint: "Show me more like this" },
  { id: "fine", label: "Fine", hint: "Worth knowing, not a priority" },
  { id: "ignore", label: "Ignore", hint: "Don't show me this kind of story" },
];

export default function StoryCard({
  item,
  analysis,
  isLoading,
  rating,
  ratingState,
  onRate,
  onAssess,
  onGenerate,
  onRemove,
  onSaveNote,
}) {
  // Assessed cards start collapsed. Previously every assessment stayed open
  // forever once it reloaded from the database, which buried the feed.
  const [open, setOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState(item.note || "");
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

      <div className="card-actions">
        {!analysis && !isLoading && (
          <button className="assess-btn" onClick={() => onAssess(item)}>
            <Gauge size={15} /> Assess this story <ChevronRight size={14} />
          </button>
        )}

        {/* Teaches the ranker. One click, and it changes what floats to the
            top of tomorrow's feed. */}
        {onRate && (
          <div className="rate" role="group" aria-label="Rate this story's priority">
            <span className="rate-label">Priority</span>
            {RATE_OPTIONS.map((o) => {
              const active = rating === o.id;
              return (
                <button
                  key={o.id}
                  className={`rate-btn rate-${o.id} ${active ? "on" : ""}`}
                  // Clicking the active option does nothing, so a rating can't
                  // be wiped by a stray second click.
                  onClick={() => !active && onRate(item, o.id)}
                  title={active ? `Marked ${o.label}. Click another to change.` : o.hint}
                  aria-pressed={active}
                >
                  {active && <Check size={11} />} {o.label}
                </button>
              );
            })}

            {ratingState === "saving" && (
              <span className="rate-note"><Loader2 size={11} className="spin" /> Saving…</span>
            )}
            {ratingState === "saved" && (
              <span className="rate-note ok"><Check size={11} /> Priority marked</span>
            )}
            {ratingState === "error" && (
              <span className="rate-note bad">Couldn&apos;t save</span>
            )}
          </div>
        )}
      </div>
      {/* Your own note. Only offered once a story is marked, and always
          visible afterwards so it can be read back later. */}
      {onSaveNote && rating && (
        <div className="note-box">
          {editingNote ? (
            <>
              <textarea
                className="note-input"
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="Why does this matter? What's the angle?"
                rows={2}
                autoFocus
              />
              <div className="note-actions">
                <button
                  className="note-save"
                  onClick={() => {
                    onSaveNote(item, draftNote.trim());
                    setEditingNote(false);
                  }}
                >
                  Save note
                </button>
                <button
                  className="note-cancel"
                  onClick={() => {
                    setDraftNote(item.note || "");
                    setEditingNote(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : item.note ? (
            <button className="note-read" onClick={() => setEditingNote(true)} title="Click to edit">
              <StickyNote size={12} /> <span>{item.note}</span>
            </button>
          ) : (
            <button className="note-add" onClick={() => setEditingNote(true)}>
              <StickyNote size={12} /> Add a note
            </button>
          )}
        </div>
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
