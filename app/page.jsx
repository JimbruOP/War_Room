"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import ManualInput from "@/components/ManualInput";
import CategoryTabs from "@/components/CategoryTabs";
import StoryCard from "@/components/StoryCard";
import LensModal from "@/components/LensModal";
import StatementModal from "@/components/StatementModal";
import SettingsModal from "@/components/SettingsModal";
import { DEFAULT_LENS } from "@/lib/constants";
import { DEMO_FEED } from "@/lib/demoFeed";
import FeedStatus from "@/components/FeedStatus";
import { analyzeStory, refreshNews } from "@/lib/api";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { fetchLens, saveLens } from "@/lib/lens";
import {
  fetchStories,
  fetchAnalyses,
  fetchFeedStatus,
  deleteStory,
  fetchMyRatings,
  fetchSaved,
  saveStory,
  unsaveStory,
  saveNote,
  rateStory,
  insertManualStory,
  saveAnalysis,
  toFeedItem,
} from "@/lib/db";

const TOP_N = 25;
// Top stories = the ranker's picks only. Your own picks live in the Marked tab.
const TOP_SCORE_THRESHOLD = 70;

export default function App() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [lens, setLens] = useState(DEFAULT_LENS);
  const [userEmail, setUserEmail] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showLens, setShowLens] = useState(false);
  const [activeCat, setActiveCat] = useState("top");
  const [manualText, setManualText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [stories, setStories] = useState(DEMO_FEED);
  const [isLive, setIsLive] = useState(false);
  const [feedError, setFeedError] = useState(null);
  const [status, setStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [cards, setCards] = useState({}); // storyId -> analysis
  const [loadingId, setLoadingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [ratings, setRatings] = useState({}); // storyId -> top|fine|ignore
  const [ratingState, setRatingState] = useState({}); // storyId -> saving|saved|error
  const [marked, setMarked] = useState([]); // your saved shelf, not limited to 24h
  const [savedIds, setSavedIds] = useState(new Set());

  // Load lens, user, live stories, and any assessments already saved.
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    (async () => {
      try {
        const row = await fetchLens(supabase);
        if (!cancelled && row) {
          setLens({
            candidate: row.candidate,
            party: row.party,
            constituency: row.constituency,
            allies: row.allies,
            rivals: row.rivals,
            notes: row.notes,
          });
        }
      } catch {
        /* fall back to DEFAULT_LENS */
      }

      try {
        const rows = await fetchStories(supabase);
        if (rows && rows.length === 0) {
          console.warn("[war-room] stories table returned 0 rows — showing demo feed.");
          if (!cancelled) setFeedError("No stories in the database yet. Run a news refresh.");
        }
        if (!cancelled && rows?.length) {
          setStories(rows.map(toFeedItem));
          setIsLive(true);
          setFeedError(null);
          const ids = rows.map((r) => r.id);
          const [saved, mine] = await Promise.all([
            fetchAnalyses(supabase, ids),
            fetchMyRatings(supabase, ids).catch(() => ({})),
          ]);
          if (!cancelled) { setCards(saved); setRatings(mine); }
        }
      } catch (err) {
        console.error("[war-room] failed to load stories:", err);
        if (!cancelled) setFeedError(err.message || "Could not load the live feed.");
      }

      try {
        const m = await fetchSaved(supabase);
        if (!cancelled) { setMarked(m); setSavedIds(new Set(m.map((x) => x.id))); }
      } catch (err) {
        console.error("[war-room] failed to load marked stories:", err);
      }

      try {
        const s = await fetchFeedStatus(supabase);
        if (!cancelled) setStatus(s);
      } catch (err) {
        console.error("[war-room] failed to load feed status:", err);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled) {
        setUserEmail(user?.email ?? null);
        setDisplayName(user?.user_metadata?.display_name ?? "");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Re-read the database so an open tab picks up what the cron has fetched.
  // This is READ-ONLY — it does not trigger an RSS/GPT fetch (the cron does
  // that), so it costs nothing. Runs every 90s and whenever the tab regains
  // focus, which covers the "came back and it was stale" case directly.
  useEffect(() => {
    if (!supabase) return;

    async function reload() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const rows = await fetchStories(supabase);
        if (!rows?.length) return;
        setStories(rows.map(toFeedItem));
        setIsLive(true);
        const ids = rows.map((r) => r.id);
        const [saved, mine, s] = await Promise.all([
          fetchAnalyses(supabase, ids),
          fetchMyRatings(supabase, ids).catch(() => ({})),
          fetchFeedStatus(supabase).catch(() => null),
        ]);
        setCards((prev) => ({ ...saved, ...prev })); // keep any in-session assessment
        setRatings(mine);
        if (s) setStatus(s);
      } catch (err) {
        console.error("[war-room] auto-reload failed:", err);
      }
    }

    const interval = setInterval(reload, 90000);
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", reload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", reload);
    };
  }, [supabase]);

  const manualCount = useMemo(() => stories.filter((s) => s.cat === "manual").length, [stories]);

  // Top stories is purely the ranker's view. What YOU kept lives in Marked.
  const topCount = useMemo(
    () => stories.filter((s) => (s.triage_score ?? 0) >= TOP_SCORE_THRESHOLD).length,
    [stories]
  );

  const filtered = useMemo(() => {
    if (activeCat === "marked") return marked;
    if (activeCat === "top")
      return stories.filter((s) => (s.triage_score ?? 0) >= TOP_SCORE_THRESHOLD);
    // Latest = newest first, ignoring rating. The DB default order is by score,
    // so re-sort a copy here by publish time.
    if (activeCat === "latest")
      return [...stories].sort(
        (a, b) => new Date(b.published || 0) - new Date(a.published || 0)
      );
    if (activeCat === "all") return stories;
    return stories.filter((f) => f.cat === activeCat);
  }, [activeCat, stories, marked]);

  // Show the best TOP_N by triage score; the rest sit behind "Show all".
  const feed = showAll ? filtered : filtered.slice(0, TOP_N);
  const hiddenCount = filtered.length - feed.length;

  async function handleSaveLens(draft) {
    setLens(draft);
    try {
      await saveLens(supabase, draft);
    } catch {
      /* keep the local change */
    }
  }

  async function handleRefreshNow() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      await refreshNews();
      const rows = await fetchStories(supabase);
      if (rows?.length) {
        setStories(rows.map(toFeedItem));
        setIsLive(true);
        setFeedError(null);
        setCards(await fetchAnalyses(supabase, rows.map((r) => r.id)));
      }
      setStatus(await fetchFeedStatus(supabase));
    } catch (err) {
      console.error("[war-room] manual refresh failed:", err);
      setRefreshError(err.message || "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRate(item, rating) {
    const previous = ratings[item.id];
    // Optimistic: the click should feel instant even though it writes remotely.
    setRatings((r) => ({ ...r, [item.id]: rating }));
    setRatingState((s) => ({ ...s, [item.id]: "saving" }));

    try {
      await rateStory(supabase, { story: item, rating });
      setRatingState((s) => ({ ...s, [item.id]: "saved" }));
      // Clear the confirmation after a beat; the button stays highlighted.
      setTimeout(
        () =>
          setRatingState((s) => {
            const next = { ...s };
            delete next[item.id];
            return next;
          }),
        2000
      );
    } catch (err) {
      console.error("[war-room] could not save rating:", err);
      // Roll the button back so it never shows a rating that wasn't stored.
      setRatings((r) => ({ ...r, [item.id]: previous }));
      setRatingState((s) => ({ ...s, [item.id]: "error" }));
    }
  }

  async function handleSaveNote(item, note) {
    setMarked((m) => m.map((x) => (x.id === item.id ? { ...x, note } : x)));
    try {
      await saveNote(supabase, item.id, note);
    } catch (err) {
      console.error("[war-room] could not save note:", err);
    }
  }

  async function handleToggleSave(item, next) {
    // Optimistic; saving should feel instant.
    setSavedIds((s) => {
      const n = new Set(s);
      next ? n.add(item.id) : n.delete(item.id);
      return n;
    });
    try {
      if (next) await saveStory(supabase, item);
      else await unsaveStory(supabase, item.id);
      setMarked(await fetchSaved(supabase));
    } catch (err) {
      console.error("[war-room] could not update saved:", err);
      setSavedIds((s) => {
        const n = new Set(s);
        next ? n.delete(item.id) : n.add(item.id);
        return n;
      });
    }
  }

  async function handleRemoveStory(item) {
    setStories((s) => s.filter((x) => x.id !== item.id));
    try {
      await deleteStory(supabase, item.id);
    } catch (err) {
      console.error("[war-room] could not remove story:", err);
    }
  }

  async function handleSaveName(name) {
    setDisplayName(name);
    if (!supabase) return;
    const { error } = await supabase.auth.updateUser({ data: { display_name: name } });
    if (error) throw error;
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function analyzeItem(item) {
    setLoadingId(item.id);
    try {
      const parsed = await analyzeStory({ lens, headline: item.headline });
      // Persist so a page refresh doesn't lose the assessment.
      try {
        const id = await saveAnalysis(supabase, item.id, parsed);
        if (id) parsed._id = id;
      } catch {
        /* analysis still usable in-session */
      }
      setCards((c) => ({ ...c, [item.id]: parsed }));
      // Behavioural signal: bothering to assess something means it mattered.
      rateStory(supabase, { story: item, rating: "top", signal: "assessed" }).catch(() => {});
    } catch {
      setCards((c) => ({ ...c, [item.id]: { error: true } }));
    } finally {
      setLoadingId(null);
    }
  }

  async function analyzeManual() {
    if (!manualText.trim()) return;
    setAnalyzing(true);
    const headline = manualText.trim();
    setManualText("");
    setActiveCat("all");

    let item;
    try {
      const row = await insertManualStory(supabase, headline);
      item = row
        ? toFeedItem(row)
        : { id: "manual-" + Date.now(), cat: "manual", headline, source: "Manual entry", time: "just now" };
    } catch {
      item = { id: "manual-" + Date.now(), cat: "manual", headline, source: "Manual entry", time: "just now" };
    }

    setStories((s) => [item, ...s]);
    await analyzeItem(item);
    setAnalyzing(false);
  }

  return (
    <div className="wr">
      <Header
        candidate={lens.candidate}
        onOpenLens={() => setShowLens(true)}
        userEmail={userEmail}
        onOpenSettings={() => setShowSettings(true)}
      />

      <ManualInput
        value={manualText}
        onChange={setManualText}
        onAnalyze={analyzeManual}
        analyzing={analyzing}
      />

      <CategoryTabs
        activeCat={activeCat}
        onSelect={(c) => { setActiveCat(c); setShowAll(false); }}
        isLive={isLive}
        manualCount={manualCount}
        topCount={topCount}
        markedCount={marked.length}
      />

      <FeedStatus
        status={status}
        onRefresh={handleRefreshNow}
        refreshing={refreshing}
        error={refreshError}
      />

      {feedError && (
        <div className="feed-error">
          Live feed unavailable — showing demo stories. {feedError}
        </div>
      )}

      <main className="feed">
        {feed.map((item) => (
          <StoryCard
            key={item.id}
            item={item}
            analysis={cards[item.id]}
            isLoading={loadingId === item.id}
            rating={ratings[item.id]}
            ratingState={ratingState[item.id]}
            onRate={handleRate}
            onAssess={analyzeItem}
            onGenerate={setSelected}
            onRemove={item.is_manual ? handleRemoveStory : undefined}
            onSaveNote={handleSaveNote}
            saved={savedIds.has(item.id)}
            onToggleSave={handleToggleSave}
          />
        ))}

        {hiddenCount > 0 && (
          <button className="show-more" onClick={() => setShowAll(true)}>
            Show {hiddenCount} more {hiddenCount === 1 ? "story" : "stories"} (lower priority)
          </button>
        )}
      </main>

      {showLens && (
        <LensModal lens={lens} setLens={handleSaveLens} onClose={() => setShowLens(false)} />
      )}
      {showSettings && (
        <SettingsModal
          email={userEmail}
          displayName={displayName}
          onSaveName={handleSaveName}
          onSignOut={handleSignOut}
          onClose={() => setShowSettings(false)}
        />
      )}
      {selected && (
        <StatementModal
          data={selected}
          lens={lens}
          supabase={supabase}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
