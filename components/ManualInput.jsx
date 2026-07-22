import { Loader2, Search, Sparkles } from "lucide-react";

export default function ManualInput({ value, onChange, onAnalyze, analyzing }) {
  return (
    <section className="manual">
      <div className="manual-label">
        <Sparkles size={14} /> Drop any headline — get risk, angles &amp; a draft
      </div>
      <div className="manual-row">
        <input
          className="manual-input"
          placeholder="Paste a news headline or event here…"
          aria-label="News headline to analyze"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
        />
        <button className="analyze-btn" onClick={onAnalyze} disabled={analyzing}>
          {analyzing ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          Analyze
        </button>
      </div>
    </section>
  );
}
