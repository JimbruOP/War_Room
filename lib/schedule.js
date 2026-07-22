// Mirrors the cron schedule in vercel.json. Cron runs in UTC.
//
//   "*/15 * * * *"  -> every 15 minutes
//
// RSS has no quota, so we poll far more often than the old NewsData setup
// allowed (which was capped at hourly by a 200/day credit budget).

export const REFRESH_MINUTES = 15;

export function nextRefresh(now = new Date()) {
  const d = new Date(now);
  d.setUTCSeconds(0, 0);
  const next = Math.floor(d.getUTCMinutes() / REFRESH_MINUTES) * REFRESH_MINUTES + REFRESH_MINUTES;
  d.setUTCMinutes(next);
  return d;
}

// 3600000 -> "1:00:00", 125000 -> "2:05"
export function formatCountdown(ms) {
  if (ms == null || ms < 0) return "--:--";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatClock(date) {
  if (!date) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
