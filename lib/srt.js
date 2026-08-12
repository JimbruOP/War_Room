// Turns an .srt subtitle file into a plain spoken transcript: drops the index
// numbers and timestamp lines, collapses repeats. If the text isn't SRT (just a
// dictated idea), it's returned as-is.
export function srtToText(raw) {
  if (!raw) return "";
  if (!raw.includes("-->")) return raw.trim();

  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (/^\d+$/.test(t)) continue; // index line
    if (t.includes("-->")) continue; // timestamp line
    out.push(t);
  }
  // Drop consecutive duplicate lines (common in auto-captions).
  const deduped = [];
  for (const l of out) if (deduped[deduped.length - 1] !== l) deduped.push(l);
  return deduped.join(" ");
}
