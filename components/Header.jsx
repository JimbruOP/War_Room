import Link from "next/link";
import { Clapperboard, Radar, Settings, SlidersHorizontal } from "lucide-react";

export default function Header({ candidate, onOpenLens, userEmail, onOpenSettings }) {
  return (
    <header className="wr-head">
      <div className="brand">
        <div className="brand-mark">
          <Radar size={20} />
        </div>
        <div>
          <div className="brand-name">WAR ROOM</div>
          <div className="brand-sub">{candidate} · Rapid Response Desk</div>
        </div>
      </div>
      <div className="head-actions">
        <Link className="lens-btn" href="/studio" title="Instagram caption studio">
          <Clapperboard size={15} /> Captions
        </Link>
        <button className="lens-btn" onClick={onOpenLens}>
          <SlidersHorizontal size={15} /> Political lens
        </button>
        {userEmail && (
          <button
            className="lens-btn icon-only"
            onClick={onOpenSettings}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
