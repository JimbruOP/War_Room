import { ChevronRight, ExternalLink, EyeOff, Flame, Gauge, Loader2, Send } from "lucide-react";
import RiskTag from "./RiskTag";
import PostureTag from "./PostureTag";

export default function StoryCard({ item, analysis, isLoading, onAssess, onGenerate }) {
  return (
    <article className="card">
      <div className="card-top">
        <span className="src">{item.source}</span>
        <span className="dot">·</span>
        <span className="time">{item.time}</span>
        {item.risk && !analysis && <RiskTag risk={item.risk} mini />}
      </div>
      <p className="headline">{item.headline}</p>

      {/* Link to the original article so the reader can get the full context
          before deciding a posture. Manual entries have no URL. */}
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

      {!analysis && !isLoading && (
        <button className="assess-btn" onClick={() => onAssess(item)}>
          <Gauge size={15} /> Assess this story <ChevronRight size={14} />
        </button>
      )}
      {isLoading && (
        <div className="loading-row">
          <Loader2 size={16} className="spin" /> Reading the room…
        </div>
      )}

      {analysis && !analysis.error && (
        <div className="analysis">
          <div className="scores">
            <RiskTag risk={analysis.risk} reason={analysis.risk_reason} />
            <div className="imp">
              <Flame size={13} />
              <span>Impact {analysis.importance}</span>
              <div className="imp-bar">
                <div className="imp-fill" style={{ width: `${analysis.importance}%` }} />
              </div>
            </div>
            <PostureTag posture={analysis.posture} reason={analysis.posture_reason} />
          </div>

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

      {analysis && analysis.error && (
        <div className="err-note">Couldn&apos;t analyze — try again.</div>
      )}
    </article>
  );
}
