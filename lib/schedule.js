// Mirrors the cron schedules in vercel.json. Vercel Cron runs in UTC, so all
// of this is computed in UTC and only formatted for display in local time.
//
//   core: "0 * * * *"     -> top of every hour
//   wide: "30 */6 * * *"  -> 00:30, 06:30, 12:30, 18:30 UTC

export const WIDE_HOURS_UTC = [0, 6, 12, 18];

export function nextCoreRun(now = new Date()) {
  const d = new Date(now);
  d.setUTCMinutes(0, 0, 0);
  d.setUTCHours(d.getUTCHours() + 1);
  return d;
}

export function nextWideRun(now = new Date()) {
  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    for (const h of WIDE_HOURS_UTC) {
      const d = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + dayOffset,
          h,
          30,
          0,
          0
        )
      );
      if (d.getTime() > now.getTime()) return d;
    }
  }
  return nextCoreRun(now);
}

// NewsData's daily quota resets at 00:00 UTC (05:30 IST).
export function nextQuotaReset(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  );
}

export function startOfQuotaDay(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );
}

// 3600 -> "1:00:00", 125 -> "2:05"
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
