import { Check, Copy } from "lucide-react";

export default function OutputBox({ label, text, meta, over, onCopy, copied }) {
  return (
    <div className="out">
      <div className="out-head">
        <span className="out-label">{label}</span>
        {meta && <span className={`out-meta ${over ? "over" : ""}`}>{meta}</span>}
        <button className="copy" onClick={onCopy} aria-label={`Copy ${label} post`}>
          {copied ? (
            <>
              <Check size={13} /> Copied
            </>
          ) : (
            <>
              <Copy size={13} /> Copy
            </>
          )}
        </button>
      </div>
      <p className="out-text">{text}</p>
    </div>
  );
}
