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
import { generateCaptions, translateCaption } from "@/lib/api";
import { saveCaption, fetchCaptions, deleteCaption } from "@/lib/db";

const STYLES = ["warm and genuine", "short and punchy", "inspirational", "informative"];

function hashList(hashtags) {
  return (hashtags || []).map((h) => (h.startsWith("#") ? h : "#" + h));
}
function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default function StudioPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [lens, setLens] = useState(DEFAULT_LENS);
  const [view, setView] = useState("write"); // write | saved

  // generator state
  const [source, setSource] = useState("");
  const [style, setStyle] = useState(STYLES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [captions, setCaptions] = useState([]);
  const [copied, setCopied] = useState(null);
  const [ml, setMl] = useState({}); // index -> {loading,text}
  const [saving, setSaving] = useState({}); // index -> {open,title,busy,done}

  // history state
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
    setSaving({});
    try {
      const res = await generateCaptions({ lens, source, style });
      setCaptions(res.captions || []);
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

  async function toMalayalam(i, cap) {
    setMl((m) => ({ ...m, [i]: { loading: true } }));
    try {
      const res = await translateCaption(cap.text);
      setMl((m) => ({ ...m, [i]: { loading: false, text: res.malayalam } }));
    } catch {
      setMl((m) => ({ ...m, [i]: { loading: false, error: true } }));
    }
  }

  async function doSave(i, cap) {
    const s = saving[i] || {};
    setSaving((v) => ({ ...v, [i]: { ...s, busy: true } }));
    try {
      const row = await saveCaption(supabase, {
        title: s.title,
        text: cap.text,
        hashtags: cap.hashtags,
        malayalam: ml[i]?.text ?? null,
        style: cap.style,
      });
      setSaving((v) => ({ ...v, [i]: { open: false, busy: false, done: true } }));
      if (row) setSavedList((list) => [row, ...list]);
    } catch {
      setSaving((v) => ({ ...v, [i]: { ...s, busy: false, error: true } }));
    }
  }

  async function removeSaved(id) {
    setSavedList((list) => list.filter((x) => x.id !== id));
    try {
      await deleteCaption(supabase, id);
    } catch {
      /* ignore */
    }
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
          </section>

          <main className="feed">
            {captions.map((cap, i) => {
              const tags = hashList(cap.hashtags);
              const fullText = cap.text + (tags.length ? "\n\n" + tags.join(" ") : "");
              const m = ml[i] || {};
              const sv = saving[i] || {};
              return (
                <article className="card" key={i}>
                  <div className="card-top">
                    <span className="cap-style">{cap.style}</span>
                    <button className="copy" onClick={() => copy(fullText, "en" + i)} style={{ marginLeft: "auto" }}>
                      {copied === "en" + i ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                    </button>
                  </div>
                  <p className="cap-text">{cap.text}</p>
                  {tags.length > 0 && <p className="cap-tags">{tags.join(" ")}</p>}

                  <div className="card-actions">
                    {!m.text && (
                      <button className="assess-btn" onClick={() => toMalayalam(i, cap)} disabled={m.loading}>
                        {m.loading ? <><Loader2 size={14} className="spin" /> Translating…</> : <><Languages size={14} /> Malayalam draft</>}
                      </button>
                    )}
                    {!sv.done && (
                      <button className="save-story" onClick={() => setSaving((v) => ({ ...v, [i]: { ...sv, open: !sv.open } }))}>
                        <Bookmark size={14} /> Save
                      </button>
                    )}
                    {sv.done && <span className="rate-note ok"><Check size={12} /> Saved</span>}
                  </div>

                  {m.error && <div className="err-note">Couldn&apos;t translate — try again.</div>}
                  {m.text && (
                    <div className="cap-ml">
                      <div className="cap-ml-head">
                        <Languages size={12} /> Malayalam (rough — please review)
                        <button className="copy" onClick={() => copy(m.text, "ml" + i)} style={{ marginLeft: "auto" }}>
                          {copied === "ml" + i ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                        </button>
                      </div>
                      <p className="cap-ml-text">{m.text}</p>
                    </div>
                  )}

                  {sv.open && !sv.done && (
                    <div className="cap-save">
                      <input
                        className="studio-input"
                        placeholder="What is this for? e.g. Independence Day reel"
                        value={sv.title || ""}
                        onChange={(e) => setSaving((v) => ({ ...v, [i]: { ...sv, title: e.target.value } }))}
                        autoFocus
                      />
                      <button className="set-save" onClick={() => doSave(i, cap)} disabled={sv.busy}>
                        {sv.busy ? <><Loader2 size={13} className="spin" /> Saving…</> : "Save to library"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </main>
        </>
      )}

      {view === "saved" && (
        <main className="feed" style={{ marginTop: 10 }}>
          {savedList.length === 0 && (
            <div className="err-note" style={{ color: "var(--muted)" }}>
              No saved captions yet. Generate one and tap Save.
            </div>
          )}
          {savedList.map((c) => {
            const tags = hashList(c.hashtags);
            const fullText = c.caption_text + (tags.length ? "\n\n" + tags.join(" ") : "");
            return (
              <article className="card" key={c.id}>
                <div className="card-top">
                  <span className="cap-title">{c.title}</span>
                  <span className="cap-date">
                    <Calendar size={11} /> {fmtDate(c.created_at)}
                  </span>
                  <button className="card-x" onClick={() => removeSaved(c.id)} aria-label="Delete" style={{ marginLeft: "auto" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <p className="cap-text">{c.caption_text}</p>
                {tags.length > 0 && <p className="cap-tags">{tags.join(" ")}</p>}
                <button className="copy" onClick={() => copy(fullText, "sv" + c.id)}>
                  {copied === "sv" + c.id ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy caption</>}
                </button>
                {c.malayalam && (
                  <div className="cap-ml">
                    <div className="cap-ml-head">
                      <Languages size={12} /> Malayalam
                      <button className="copy" onClick={() => copy(c.malayalam, "svml" + c.id)} style={{ marginLeft: "auto" }}>
                        {copied === "svml" + c.id ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                      </button>
                    </div>
                    <p className="cap-ml-text">{c.malayalam}</p>
                  </div>
                )}
              </article>
            );
          })}
        </main>
      )}
    </div>
  );
}
