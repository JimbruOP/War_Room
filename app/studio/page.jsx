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
} from "lucide-react";
import { DEFAULT_LENS } from "@/lib/constants";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { fetchLens } from "@/lib/lens";
import { generateCaptions, translateCaption } from "@/lib/api";

const STYLES = ["warm and genuine", "short and punchy", "inspirational", "informative"];

export default function StudioPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [lens, setLens] = useState(DEFAULT_LENS);
  const [source, setSource] = useState("");
  const [style, setStyle] = useState(STYLES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [captions, setCaptions] = useState([]);
  const [copied, setCopied] = useState(null);
  const [ml, setMl] = useState({}); // index -> {loading, text}

  useEffect(() => {
    if (!supabase) return;
    fetchLens(supabase)
      .then((row) => {
        if (row) setLens((l) => ({ ...l, ...row }));
      })
      .catch(() => {});
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
      const full = cap.text + (cap.hashtags?.length ? "\n\n" + cap.hashtags.map((h) => (h.startsWith("#") ? h : "#" + h)).join(" ") : "");
      const res = await translateCaption(full);
      setMl((m) => ({ ...m, [i]: { loading: false, text: res.malayalam } }));
    } catch (e) {
      setMl((m) => ({ ...m, [i]: { loading: false, error: true } }));
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

      <section className="manual" style={{ marginTop: 18 }}>
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
              <button
                key={s}
                className={`tone ${style === s ? "on" : ""}`}
                onClick={() => setStyle(s)}
              >
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
          const hashtags = (cap.hashtags || []).map((h) => (h.startsWith("#") ? h : "#" + h));
          const fullText = cap.text + (hashtags.length ? "\n\n" + hashtags.join(" ") : "");
          const m = ml[i] || {};
          return (
            <article className="card" key={i}>
              <div className="card-top">
                <span className="cap-style">{cap.style}</span>
                <button className="copy" onClick={() => copy(fullText, "en" + i)} style={{ marginLeft: "auto" }}>
                  {copied === "en" + i ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
              <p className="cap-text">{cap.text}</p>
              {hashtags.length > 0 && <p className="cap-tags">{hashtags.join(" ")}</p>}

              {!m.text && (
                <button className="assess-btn" onClick={() => toMalayalam(i, cap)} disabled={m.loading}>
                  {m.loading ? <><Loader2 size={14} className="spin" /> Translating…</> : <><Languages size={14} /> Malayalam draft</>}
                </button>
              )}
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
            </article>
          );
        })}
      </main>
    </div>
  );
}
