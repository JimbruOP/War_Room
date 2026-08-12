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
} from "lucide-react";
import { DEFAULT_LENS } from "@/lib/constants";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { fetchLens } from "@/lib/lens";
import { srtToText } from "@/lib/srt";
import { generateCaptions, translateCaption } from "@/lib/api";
import { saveCaptionSet, fetchCaptions, updateCaptionTitle, deleteCaption } from "@/lib/db";

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
  const [captions, setCaptions] = useState([]);
  const [autoSaved, setAutoSaved] = useState(false);
  const [copied, setCopied] = useState(null);
  const [ml, setMl] = useState({}); // key -> {loading,text}

  const [savedList, setSavedList] = useState([]);

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
    setMl({});
    setAutoSaved(false);
    try {
      const res = await generateCaptions({ lens, source, style });
      const options = res.captions || [];
      setCaptions(options);
      // Auto-save the whole generation as one dated entry.
      try {
        const row = await saveCaptionSet(supabase, {
          title: defaultTitle(source),
          source: srtToText(source).slice(0, 2000),
          options,
        });
        if (row) {
          setSavedList((list) => [{ ...row, options }, ...list]);
          setAutoSaved(true);
        }
      } catch (e) {
        console.error("[studio] auto-save failed:", e);
      }
    } catch (e) {
      setError(e.message || "Could not generate captions.");
    } finally {
      setLoading(false);
    }
  }

  function copy(text, key) {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  async function toMalayalam(key, text) {
    setMl((m) => ({ ...m, [key]: { loading: true } }));
    try {
      const res = await translateCaption(text);
      setMl((m) => ({ ...m, [key]: { loading: false, text: res.malayalam } }));
    } catch {
      setMl((m) => ({ ...m, [key]: { loading: false, error: true } }));
    }
  }

  async function renameSaved(id, title) {
    setSavedList((list) => list.map((x) => (x.id === id ? { ...x, title } : x)));
    try {
      await updateCaptionTitle(supabase, id, title);
    } catch {}
  }
  async function removeSaved(id) {
    setSavedList((list) => list.filter((x) => x.id !== id));
    try {
      await deleteCaption(supabase, id);
    } catch {}
  }

  function OptionBlock({ opt, keyBase }) {
    const tags = hashList(opt.hashtags);
    const full = opt.text + (tags.length ? "\n\n" + tags.join(" ") : "");
    const m = ml[keyBase] || {};
    return (
      <div className="cap-opt">
        <div className="cap-opt-head">
          <span className="cap-style">{opt.style}</span>
          <button className="copy" onClick={() => copy(full, keyBase)} style={{ marginLeft: "auto" }}>
            {copied === keyBase ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
          </button>
        </div>
        <p className="cap-text">{opt.text}</p>
        {tags.length > 0 && <p className="cap-tags">{tags.join(" ")}</p>}
        {!m.text && (
          <button className="assess-btn" onClick={() => toMalayalam(keyBase, opt.text)} disabled={m.loading}>
            {m.loading ? <><Loader2 size={14} className="spin" /> Translating…</> : <><Languages size={14} /> Malayalam draft</>}
          </button>
        )}
        {m.error && <div className="err-note">Couldn&apos;t translate — try again.</div>}
        {m.text && (
          <div className="cap-ml">
            <div className="cap-ml-head">
              <Languages size={12} /> Malayalam (rough — please review)
              <button className="copy" onClick={() => copy(m.text, keyBase + "ml")} style={{ marginLeft: "auto" }}>
                {copied === keyBase + "ml" ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
            <p className="cap-ml-text">{m.text}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="wr">
      <header className="wr-head">
        <div className="brand">
          <div className="brand-mark">
            <Clapperboard size={20} />
          </div>
          <div>
            <div className="brand-name">CAPTIONS</div>
            <div className="brand-sub">{lens.candidate} · Reel caption studio</div>
          </div>
        </div>
        <Link className="lens-btn" href="/">
          <ArrowLeft size={15} /> Back to desk
        </Link>
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
                  <button key={s} className={`tone ${style === s ? "on" : ""}`} onClick={() => setStyle(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <button className="gen-btn big" onClick={generate} disabled={!source.trim() || loading}>
              {loading ? (
                <><Loader2 size={16} className="spin" /> Writing captions…</>
              ) : (
                <><Sparkles size={15} /> Generate captions</>
              )}
            </button>
            {error && <div className="err-note">{error}</div>}
            {autoSaved && (
              <div className="rate-note ok" style={{ marginTop: 8 }}>
                <Check size={12} /> Saved to your library — rename it under Saved.
              </div>
            )}
          </section>

          <main className="feed">
            {captions.map((cap, i) => (
              <article className="card" key={i}>
                <OptionBlock opt={cap} keyBase={"w" + i} />
              </article>
            ))}
          </main>
        </>
      )}

      {view === "saved" && (
        <main className="feed" style={{ marginTop: 10 }}>
          {savedList.length === 0 && (
            <div className="err-note" style={{ color: "var(--muted)" }}>
              Nothing saved yet. Every generation is saved here automatically.
            </div>
          )}
          {savedList.map((entry) => (
            <article className="card" key={entry.id}>
              <div className="card-top">
                <input
                  className="cap-title-input"
                  defaultValue={entry.title}
                  onBlur={(e) => renameSaved(entry.id, e.target.value)}
                  aria-label="Title"
                />
                <span className="cap-date">
                  <Calendar size={11} /> {fmtDate(entry.created_at)}
                </span>
                <button className="card-x" onClick={() => removeSaved(entry.id)} aria-label="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
              {entry.options.map((opt, j) => (
                <OptionBlock key={j} opt={opt} keyBase={"s" + entry.id + j} />
              ))}
            </article>
          ))}
        </main>
      )}
    </div>
  );
}
