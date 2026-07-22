// Server-safe constants (no icon imports) — used by both API routes and UI.

export const DEFAULT_LENS = {
  candidate: "Shoba Surendran",
  party: "BJP",
  constituency: "Alappuzha (Lok Sabha 2029 target)",
  allies: "BJP, NDA, Union Government (Centre)",
  rivals: "UDF (Congress/INC, IUML), LDF (CPM/CPI)",
  notes:
    "Hindu-consolidation + coastal (Dheevara) base. Pro-Centre, Make-in-India, development & accountability framing. Avoid attacking during active tragedies. Watch: attacking a UDF minister is fair game for BJP.",
};

// Category ids + labels. Icons are attached in the UI layer (client-only).
export const CATEGORIES = [
  { id: "kerala", label: "Kerala Politics" },
  { id: "indian", label: "Indian Politics" },
  { id: "intl", label: "International" },
  { id: "sports", label: "Sports" },
];

export const TONES = ["emotional", "hard-hitting", "statesmanlike", "simple & warm"];


// Risk + posture display metadata (label/colors/classes). Icons attached in UI.
export const RISK = {
  low: { label: "Safe to engage", color: "var(--ok)", bg: "var(--ok-bg)" },
  medium: { label: "Handle with care", color: "var(--warn)", bg: "var(--warn-bg)" },
  high: { label: "Sensitive — caution", color: "var(--danger)", bg: "var(--danger-bg)" },
};

export const POSTURE = {
  attack: { label: "Attack", cls: "p-attack" },
  align: { label: "Align", cls: "p-align" },
  condolence: { label: "Condolence", cls: "p-cond" },
  celebrate: { label: "Celebrate", cls: "p-celeb" },
  stay_silent: { label: "Stay silent", cls: "p-silent" },
};
