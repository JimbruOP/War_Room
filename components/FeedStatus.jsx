"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Clock, Gauge } from "lucide-react";
import {
  nextCoreRun,
  nextWideRun,
  nextQuotaReset,
  formatCountdown,
  formatClock,
} from "@/lib/schedule";
import { timeAgo } from "@/lib/db";
import { NEWSDATA_DAILY_LIMIT, CORE_QUERY_COUNT } from "@/lib/constants";

export default function FeedStatus({ status, onRefresh, refreshing, error }) {
  const [now, setNow] = useState(() => new Date());

  // Tick once a second so the countdown is live.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!status) return null;

  const coreAt = nextCoreRun(now);
  const wideAt = nextWideRun(now);
  const resetAt = nextQuotaReset(now);

  const used = status.creditsUsed ?? 0;
  const pct = Math.min(100, Math.round((used / NEWSDATA_DAILY_LIMIT) * 100));
  const level = pct >= 85 ? "danger" : pct >= 60 ? "warn" : "ok";
  const remaining = Math.max(0, NEWSDATA_DAILY_LIMIT - used);
  const canAfford = remaining >= CORE_QUERY_COUNT;

  return (
    <div className="fstat">
      <div className="fstat-row">
        <span className="fstat-item">
          <Clock size={12} />
          Last fetch{" "}
          <b>{status.last ? timeAgo(status.last.created_at) : "never"}</b>
        </span>

        <span className="fstat-sep">·</span>

        <span className="fstat-item">
          Next Kerala fetch in <b className="fstat-count">{formatCountdown(coreAt - now)}</b>
          <span className="fstat-dim"> ({formatClock(coreAt)})</span>
        </span>

        <span className="fstat-sep">·</span>

        <span className="fstat-item fstat-dim">
          National/world {formatCountdown(wideAt - now)}
        </span>

        <button
          className="fstat-btn"
          onClick={onRefresh}
          disabled={refreshing || !canAfford}
          title={
            canAfford
              ? `Fetch the Kerala desk now (costs ${CORE_QUERY_COUNT} credits)`
              : "Not enough credits left today"
          }
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

      <div className="fstat-row">
        <span className={`fstat-item fstat-${level}`}>
          <Gauge size={12} />
          <b>
            {used} / {NEWSDATA_DAILY_LIMIT}
          </b>{" "}
          credits used today
        </span>
        <div className="fstat-bar">
          <div className={`fstat-fill fstat-fill-${level}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="fstat-item fstat-dim">
          {remaining} left · resets in {formatCountdown(resetAt - now)}
        </span>
      </div>

      {error && <div className="fstat-err">{error}</div>}
    </div>
  );
}
