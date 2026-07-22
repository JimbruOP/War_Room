import { Bookmark, Globe2, Landmark, PenLine, Star, Trophy, Vote } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";

const CAT_ICONS = {
  kerala: Landmark,
  indian: Vote,
  intl: Globe2,
  sports: Trophy,
  manual: PenLine,
};

export default function CategoryTabs({
  activeCat,
  onSelect,
  isLive,
  manualCount = 0,
  topCount = 0,
  markedCount = 0,
}) {
  return (
    <nav className="tabs">
      {/* Top stories = what the ranker scored high. What YOU kept is a
          separate thing, in the Marked tab. */}
      <button
        className={`tab tab-top ${activeCat === "top" ? "on" : ""}`}
        onClick={() => onSelect("top")}
        title="What the ranker scored 70+ in the last 24 hours"
      >
        <Star size={14} /> Top stories{topCount > 0 ? ` (${topCount})` : ""}
      </button>

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
      {/* Your own shelf: things you marked, kept beyond the 24h feed window. */}
      {markedCount > 0 && (
        <button
          className={`tab tab-marked ${activeCat === "marked" ? "on" : ""}`}
          onClick={() => onSelect("marked")}
          title="Stories you marked, with your notes. Kept beyond the 24h window."
        >
          <Bookmark size={14} /> Marked ({markedCount})
        </button>
      )}

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
