import { Globe2, Landmark, PenLine, Trophy, Vote } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";

const CAT_ICONS = {
  kerala: Landmark,
  indian: Vote,
  intl: Globe2,
  sports: Trophy,
  manual: PenLine,
};

export default function CategoryTabs({ activeCat, onSelect, isLive, manualCount = 0 }) {
  return (
    <nav className="tabs">
      <button
        className={`tab ${activeCat === "all" ? "on" : ""}`}
        onClick={() => onSelect("all")}
      >
        All feeds
      </button>
      {CATEGORIES.map((c) => {
        const Icon = CAT_ICONS[c.id];
        return (
          <button
            key={c.id}
            className={`tab ${activeCat === c.id ? "on" : ""}`}
            onClick={() => onSelect(c.id)}
          >
            {Icon && <Icon size={14} />} {c.label}
          </button>
        );
      })}
      {/* Pasted headlines get their own tab so they stop sitting on top of
          the live feed forever. */}
      {manualCount > 0 && (
        <button
          className={`tab ${activeCat === "manual" ? "on" : ""}`}
          onClick={() => onSelect("manual")}
        >
          <PenLine size={14} /> My checks ({manualCount})
        </button>
      )}

      <span className="feed-note">
        {isLive ? "Live feed · RSS" : "Live feed = news-API layer (demo data)"}
      </span>
    </nav>
  );
}
