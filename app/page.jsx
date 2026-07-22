"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import ManualInput from "@/components/ManualInput";
import CategoryTabs from "@/components/CategoryTabs";
import StoryCard from "@/components/StoryCard";
import LensModal from "@/components/LensModal";
import StatementModal from "@/components/StatementModal";
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
  insertManualStory,
  saveAnalysis,
  toFeedItem,
} from "@/lib/db";

export default function App() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [lens, setLens] = useState(DEFAULT_LENS);
  const [userEmail, setUserEmail] = useState(null);
  const [showLens, setShowLens] = useState(false);
  const [activeCat, setActiveCat] = useState("all");
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
          const saved = await fetchAnalyses(
            supabase,
            rows.map((r) => r.id)
          );
          if (!cancelled) setCards(saved);
        }
      } catch (err) {
        console.error("[war-room] failed to load stories:", err);
        if (!cancelled) setFeedError(err.message || "Could not load the live feed.");
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
      if (!cancelled) setUserEmail(user?.email ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const feed = useMemo(
    () => (activeCat === "all" ? stories : stories.filter((f) => f.cat === activeCat)),
    [activeCat, stories]
  );

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
      await refreshNews("core");
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
        onSignOut={handleSignOut}
      />

      <ManualInput
        value={manualText}
        onChange={setManualText}
        onAnalyze={analyzeManual}
        analyzing={analyzing}
      />

      <CategoryTabs activeCat={activeCat} onSelect={setActiveCat} isLive={isLive} />

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
            onAssess={analyzeItem}
            onGenerate={setSelected}
          />
        ))}
      </main>

      {showLens && (
        <LensModal lens={lens} setLens={handleSaveLens} onClose={() => setShowLens(false)} />
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
