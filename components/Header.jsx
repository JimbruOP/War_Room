import { LogOut, Radar, Settings } from "lucide-react";

export default function Header({ candidate, onOpenLens, userEmail, onSignOut }) {
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
        <button className="lens-btn" onClick={onOpenLens}>
          <Settings size={15} /> Political lens
        </button>
        {userEmail && (
          <button className="lens-btn" onClick={onSignOut} title={userEmail} aria-label="Sign out">
            <LogOut size={15} /> Sign out
          </button>
        )}
      </div>
    </header>
  );
}
