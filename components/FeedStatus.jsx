"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Clock, Rss, AlertTriangle } from "lucide-react";
import { nextRefresh, formatCountdown, formatClock, REFRESH_MINUTES } from "@/lib/schedule";
import { timeAgo } from "@/lib/db";

export default function FeedStatus({ status, onRefresh, refreshing, error }) {
  const [now, setNow] = useState(() => new Date());

  // Tick once a second so the countdown is live.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!status) return null;

  const nextAt = nextRefresh(now);
  const last = status.last;
  const feedErrors = Array.isArray(last?.errors) ? last.errors : [];

  // Only show a countdown if a scheduler is demonstrably running.
  //
  // "Was there a fetch recently?" is NOT enough — clicking Refresh now, or a
  // one-off run, satisfies that while nothing is actually scheduled. A real
  // scheduler produces fetches that RECUR at roughly the interval, so require:
  //   1. the most recent scheduled fetch is fresh, and
  //   2. the one before it lands about an interval earlier.
  const schedulerRunning = (() => {
    const scheduled = (status.recent || []).filter((r) => r.triggered_by === "cron");
    if (scheduled.length < 2) return false;
    const t0 = new Date(scheduled[0].created_at).getTime();
    const t1 = new Date(scheduled[1].created_at).getTime();
    const freshMin = (now.getTime() - t0) / 60000;
    const gapMin = (t0 - t1) / 60000;
    // The gap must resemble the interval. A burst of runs seconds apart is
    // someone testing by hand, not a schedule.
    return (
      freshMin <= REFRESH_MINUTES * 2 &&
      gapMin >= REFRESH_MINUTES * 0.5 &&
      gapMin <= REFRESH_MINUTES * 2
    );
  })();

  return (
    <div className="fstat">
      <div className="fstat-row">
        {/* Feed count comes from the log, not lib/rss.js — that module imports
            node:crypto and must never reach the browser bundle. */}
        <span className="fstat-item">
          <Rss size={12} />
          <b>{last?.queries_used ?? "—"}</b> live feeds
        </span>

        <span className="fstat-sep">·</span>

        <span className="fstat-item">
          <Clock size={12} />
          Last fetch <b>{last ? timeAgo(last.created_at) : "never"}</b>
          {last?.inserted != null && (
            <span className="fstat-dim"> (+{last.inserted} new)</span>
          )}
        </span>

        <span className="fstat-sep">·</span>

        {schedulerRunning ? (
          <span className="fstat-item">
            Next in <b className="fstat-count">{formatCountdown(nextAt - now)}</b>
            <span className="fstat-dim"> ({formatClock(nextAt)})</span>
          </span>
        ) : (
          <span className="fstat-item fstat-idle" title="No scheduler is calling /api/news/refresh. Deploy, or use Refresh now.">
            <AlertTriangle size={12} />
            <b>Auto-refresh is not running</b>
            <span className="fstat-dim">— use Refresh now</span>
          </span>
        )}

        <button
          className="fstat-btn"
          onClick={onRefresh}
          disabled={refreshing}
          title="Poll every feed now"
        >
          {refreshing ? (
            <>
              <Loader2 size={13} className="spin" /> Fetching…
            </>
          ) : (
            <>
              <RefreshCw size={13} /> Refresh now
            </>
          )}
        </button>
      </div>

      {feedErrors.length > 0 && (
        <div className="fstat-item fstat-warnrow">
          <AlertTriangle size={12} />
          {feedErrors.length} feed{feedErrors.length > 1 ? "s" : ""} failed last run:{" "}
          <span className="fstat-dim">{feedErrors.join(" · ")}</span>
        </div>
      )}

      {error && <div className="fstat-err">{error}</div>}
    </div>
  );
}
