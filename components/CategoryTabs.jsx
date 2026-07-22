import { Globe2, Landmark, Trophy, Vote } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";

const CAT_ICONS = { kerala: Landmark, indian: Vote, intl: Globe2, sports: Trophy };

export default function CategoryTabs({ activeCat, onSelect, isLive }) {
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
      <span className="feed-note">
        {isLive ? "Live feed · NewsData.io" : "Live feed = news-API layer (demo data)"}
      </span>
    </nav>
  );
}
