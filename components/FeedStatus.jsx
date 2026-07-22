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

  // Only show a countdown if a scheduler is demonstrably running. On a laptop
  // there is no cron, so the old countdown promised refreshes that never came.
  // If the last fetch is older than a few intervals, say so instead of lying.
  const lastAgeMin = last ? (now - new Date(last.created_at)) / 60000 : Infinity;
  const schedulerRunning = lastAgeMin <= REFRESH_MINUTES * 3;

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
