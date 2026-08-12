"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clapperboard,
  Copy,
  Check,
  Loader2,
  Sparkles,
  Upload,
  Languages,
  Bookmark,
  Trash2,
  Calendar,
  ChevronLeft,
} from "lucide-react";
import { DEFAULT_LENS } from "@/lib/constants";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { fetchLens } from "@/lib/lens";
import { srtToText } from "@/lib/srt";
import { generateCaptions, translateCaption } from "@/lib/api";
import {
  saveChosenCaption,
  fetchCaptions,
  updateCaptionTitle,
  updateCaptionMalayalam,
  deleteCaption,
} from "@/lib/db";

const STYLES = ["warm and genuine", "short and punchy", "inspirational", "informative"];

const hashList = (h) => (h || []).map((x) => (x.startsWith("#") ? x : "#" + x));
const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
};
function defaultTitle(source) {
  const clean = srtToText(source || "");
  if (!clean) return "Untitled reel";
  return clean.length > 60 ? clean.slice(0, 60).trim() + "…" : clean;
}

export default function StudioPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [lens, setLens] = useState(DEFAULT_LENS);
  const [view, setView] = useState("write");

  const [source, setSource] = useState("");
  const [style, setStyle] = useState(STYLES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [captions, setCaptions] = useState([]); // the 4 options
  const [chosen, setChosen] = useState(null); // the picked option
  const [title, setTitle] = useState("");
  const [chosenMl, setChosenMl] = useState(null); // { loading, text }
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(null);

  const [savedList, setSavedList] = useState([]);
  const [savedMl, setSavedMl] = useState({}); // id -> {loading,text}

  useEffect(() => {
    if (!supabase) return;
    fetchLens(supabase).then((row) => row && setLens((l) => ({ ...l, ...row }))).catch(() => {});
    fetchCaptions(supabase).then(setSavedList).catch(() => {});
  }, [supabase]);

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSource(String(reader.result || ""));
    reader.readAsText(file);
  }

  async function generate() {
    if (!source.trim()) return;
    setLoading(true);
    setError(null);
    setCaptions([]);
    setChosen(null);
    setChosenMl(null);
    setSaved(false);
    try {
      const res = await generateCaptions({ lens, source, style });
      setCaptions(res.captions || []);
    } catch (e) {
      setError(e.message || "Could not generate captions.");
    } finally {
      setLoading(false);
    }
  }

  function choose(opt) {
    setChosen(opt);
    setTitle(defaultTitle(source));
    setChosenMl(null);
    setSaved(false);
  }

  async function translateChosen() {
    setChosenMl({ loading: true });
    try {
      const res = await translateCaption(chosen.text);
      setChosenMl({ loading: false, text: res.malayalam });
    } catch {
      setChosenMl({ loading: false, error: true });
    }
  }

  async function saveChosen() {
    if (!chosen) return;
    setSaving(true);
    try {
      const row = await saveChosenCaption(supabase, {
        title,
        text: chosen.text,
        hashtags: chosen.hashtags,
        style: chosen.style,
        malayalam: chosenMl?.text ?? null,
      });
      if (row) setSavedList((list) => [row, ...list]);
      setSaved(true);
    } catch (e) {
      setError(e.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  function copy(text, key) {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  async function renameSaved(id, t) {
    setSavedList((list) => list.map((x) => (x.id === id ? { ...x, title: t } : x)));
    try { await updateCaptionTitle(supabase, id, t); } catch {}
  }
  async function removeSaved(id) {
    setSavedList((list) => list.filter((x) => x.id !== id));
    try { await deleteCaption(supabase, id); } catch {}
  }
  async function translateSaved(entry) {
    setSavedMl((m) => ({ ...m, [entry.id]: { loading: true } }));
    try {
      const res = await translateCaption(entry.caption_text);
      setSavedMl((m) => ({ ...m, [entry.id]: { loading: false, text: res.malayalam } }));
      setSavedList((list) => list.map((x) => (x.id === entry.id ? { ...x, malayalam: res.malayalam } : x)));
      updateCaptionMalayalam(supabase, entry.id, res.malayalam).catch(() => {});
    } catch {
      setSavedMl((m) => ({ ...m, [entry.id]: { loading: false, error: true } }));
    }
  }

  return (
    <div className="wr">
      <header className="wr-head">
        <div className="brand">
          <div className="brand-mark"><Clapperboard size={20} /></div>
          <div>
            <div className="brand-name">CAPTIONS</div>
            <div className="brand-sub">{lens.candidate} · Reel caption studio</div>
          </div>
        </div>
        <Link className="lens-btn" href="/"><ArrowLeft size={15} /> Back to desk</Link>
      </header>

      <nav className="tabs">
        <button className={`tab ${view === "write" ? "on" : ""}`} onClick={() => setView("write")}>
          <Sparkles size={14} /> Write
        </button>
        <button className={`tab ${view === "saved" ? "on" : ""}`} onClick={() => setView("saved")}>
          <Bookmark size={14} /> Saved{savedList.length ? ` (${savedList.length})` : ""}
        </button>
      </nav>

      {view === "write" && (
        <>
          {/* Input — hidden once you've picked an angle, to keep focus */}
          {!chosen && (
            <section className="manual" style={{ marginTop: 6 }}>
              <div className="manual-label">
                <Sparkles size={14} /> Paste the reel idea, or upload its .srt
              </div>
              <textarea
                className="studio-input"
                rows={5}
                placeholder="Type or dictate the reel idea here, or upload the subtitle (.srt) file below…"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
              <div className="studio-controls">
                <label className="srt-upload">
                  <Upload size={14} /> Upload .srt
                  <input type="file" accept=".srt,text/plain" onChange={onFile} hidden />
                </label>
                <div className="tone-row">
                  {STYLES.map((s) => (
                    <button key={s} className={`tone ${style === s ? "on" : ""}`} onClick={() => setStyle(s)}>{s}</button>
                  ))}
                </div>
              </div>
              <button className="gen-btn big" onClick={generate} disabled={!source.trim() || loading}>
                {loading ? <><Loader2 size={16} className="spin" /> Writing angles…</> : <><Sparkles size={15} /> Generate 4 angles</>}
              </button>
              {error && <div className="err-note">{error}</div>}
            </section>
          )}

          {/* Step 1: pick one of the 4 angles */}
          {!chosen && captions.length > 0 && (
            <main className="feed">
              <div className="choose-hint">Pick the angle you want to use</div>
              {captions.map((cap, i) => {
                const tags = hashList(cap.hashtags);
                return (
                  <article className="card choose-card" key={i} onClick={() => choose(cap)}>
                    <div className="card-top"><span className="cap-style">{cap.style}</span></div>
                    <p className="cap-text">{cap.text}</p>
                    {tags.length > 0 && <p className="cap-tags">{tags.join(" ")}</p>}
                    <button className="gen-btn" onClick={(e) => { e.stopPropagation(); choose(cap); }}>
                      Choose this angle
                    </button>
                  </article>
                );
              })}
            </main>
          )}

          {/* Step 2: the chosen angle — Malayalam + title + save */}
          {chosen && (
            <main className="feed">
              <button className="back-link" onClick={() => setChosen(null)}>
                <ChevronLeft size={14} /> Pick a different angle
              </button>
              <article className="card card-done">
                <div className="card-top">
                  <span className="cap-style">{chosen.style}</span>
                  <button
                    className="copy"
                    style={{ marginLeft: "auto" }}
                    onClick={() => copy(chosen.text + "\n\n" + hashList(chosen.hashtags).join(" "), "c")}
                  >
                    {copied === "c" ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>
                <p className="cap-text">{chosen.text}</p>
                {hashList(chosen.hashtags).length > 0 && (
                  <p className="cap-tags">{hashList(chosen.hashtags).join(" ")}</p>
                )}

                <div className="field" style={{ marginTop: 12 }}>
                  <label htmlFor="cap-title">What is this for?</label>
                  <input
                    id="cap-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Independence Day reel"
                  />
                </div>

                {!chosenMl?.text && (
                  <button className="assess-btn" onClick={translateChosen} disabled={chosenMl?.loading}>
                    {chosenMl?.loading ? <><Loader2 size={14} className="spin" /> Translating…</> : <><Languages size={14} /> Malayalam draft</>}
                  </button>
                )}
                {chosenMl?.error && <div className="err-note">Couldn&apos;t translate — try again.</div>}
                {chosenMl?.text && (
                  <div className="cap-ml">
                    <div className="cap-ml-head">
                      <Languages size={12} /> Malayalam (rough — please review)
                      <button className="copy" style={{ marginLeft: "auto" }} onClick={() => copy(chosenMl.text, "cml")}>
                        {copied === "cml" ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                      </button>
                    </div>
                    <p className="cap-ml-text">{chosenMl.text}</p>
                  </div>
                )}

                {!saved ? (
                  <button className="gen-btn big" style={{ marginTop: 12 }} onClick={saveChosen} disabled={saving}>
                    {saving ? <><Loader2 size={16} className="spin" /> Saving…</> : <><Bookmark size={15} /> Save to library</>}
                  </button>
                ) : (
                  <div className="rate-note ok" style={{ marginTop: 12 }}><Check size={12} /> Saved to your library</div>
                )}
              </article>
            </main>
          )}
        </>
      )}

      {view === "saved" && (
        <main className="feed" style={{ marginTop: 10 }}>
          {savedList.length === 0 && (
            <div className="err-note" style={{ color: "var(--muted)" }}>
              Nothing saved yet. Generate, pick an angle, and save it.
            </div>
          )}
          {savedList.map((entry) => {
            const tags = hashList(entry.hashtags);
            const full = entry.caption_text + (tags.length ? "\n\n" + tags.join(" ") : "");
            const sm = savedMl[entry.id] || {};
            return (
              <article className="card" key={entry.id}>
                <div className="card-top">
                  <input
                    className="cap-title-input"
                    defaultValue={entry.title}
                    onBlur={(e) => renameSaved(entry.id, e.target.value)}
                    aria-label="Title"
                  />
                  <span className="cap-date"><Calendar size={11} /> {fmtDate(entry.created_at)}</span>
                  <button className="card-x" onClick={() => removeSaved(entry.id)} aria-label="Delete"><Trash2 size={13} /></button>
                </div>
                <p className="cap-text">{entry.caption_text}</p>
                {tags.length > 0 && <p className="cap-tags">{tags.join(" ")}</p>}
                <button className="copy" onClick={() => copy(full, "sv" + entry.id)}>
                  {copied === "sv" + entry.id ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy caption</>}
                </button>

                {entry.malayalam ? (
                  <div className="cap-ml">
                    <div className="cap-ml-head">
                      <Languages size={12} /> Malayalam
                      <button className="copy" style={{ marginLeft: "auto" }} onClick={() => copy(entry.malayalam, "svml" + entry.id)}>
                        {copied === "svml" + entry.id ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                      </button>
                    </div>
                    <p className="cap-ml-text">{entry.malayalam}</p>
                  </div>
                ) : (
                  <button className="assess-btn" style={{ marginTop: 8 }} onClick={() => translateSaved(entry)} disabled={sm.loading}>
                    {sm.loading ? <><Loader2 size={14} className="spin" /> Translating…</> : <><Languages size={14} /> Malayalam draft</>}
                  </button>
                )}
              </article>
            );
          })}
        </main>
      )}
    </div>
  );
}
