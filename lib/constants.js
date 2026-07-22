// Server-safe constants (no icon imports) — used by both API routes and UI.

// Fallback only — the live lens is the political_lens row in Supabase, which
// the team edits from the UI. Kept in sync so a fresh install isn't seeded
// with a stale picture of who governs Kerala.
export const DEFAULT_LENS = {
  candidate: "Shoba Surendran",
  party: "BJP",
  constituency: "Kerala statewide — Lok Sabha 2029, seat not yet confirmed",
  allies:
    "BJP, NDA, Union Government (Centre). Never criticise or undercut BJP workers and karyakartas.",
  rivals:
    "UDF (Congress/INC, IUML) — the sitting Kerala government under Chief Minister V.D. Satheesan. LDF (CPM/CPI) — now in opposition.",
  notes:
    "Hindu-consolidation + coastal (Dheevara) base. Pro-Centre, Make-in-India, development and accountability framing. The UDF now governs Kerala, so accountability attacks target the Satheesan government: governance failures, law and order, health and education delivery, corruption, broken promises. The LDF (CPM/CPI) is now in opposition — still a rival worth attacking on its record and its conduct, but no longer responsible for running the state. Never attack our own side: BJP workers and karyakartas are off limits, internal loyalty matters. Avoid attacking during active tragedies; lead with condolence or stay silent. The Lok Sabha seat is not confirmed yet, so keep messaging statewide rather than tied to one constituency.",
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
