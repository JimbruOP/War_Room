"use client";

import { useState } from "react";
import { Settings, X as XIcon } from "lucide-react";

const FIELDS = [
  ["candidate", "Candidate"],
  ["party", "Party"],
  ["constituency", "Constituency focus"],
  ["allies", "Allies (never attack)"],
  ["rivals", "Rivals (fair to attack)"],
  ["notes", "Strategy notes"],
];

export default function LensModal({ lens, setLens, onClose }) {
  const [draft, setDraft] = useState(lens);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Political lens">
        <div className="modal-head">
          <h3>
            <Settings size={16} /> Political lens
          </h3>
          <button className="x" onClick={onClose} aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>
        <p className="modal-sub">
          Everything the angle-generator assumes about your client. Change it anytime.
        </p>
        {FIELDS.map(([k, label]) => (
          <div key={k} className="field">
            <label htmlFor={`lens-${k}`}>{label}</label>
            {k === "notes" ? (
              <textarea
                id={`lens-${k}`}
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                rows={3}
              />
            ) : (
              <input
                id={`lens-${k}`}
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
              />
            )}
          </div>
        ))}
        <button
          className="save-btn"
          onClick={() => {
            setLens(draft);
            onClose();
          }}
        >
          Save lens
        </button>
      </div>
    </div>
  );
}
