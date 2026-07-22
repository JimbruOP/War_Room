// Client-side helpers. These call our own backend (/api/*), which holds the
// keys server-side. The browser never sees OpenAI or NewsData credentials.

async function postJson(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export function analyzeStory({ lens, headline }) {
  return postJson("/api/analyze", { lens, headline });
}

export function generateStatement({ lens, headline, angle, posture, tone }) {
  return postJson("/api/generate", { lens, headline, angle, posture, tone });
}

// Manual "Refresh now". Polls every RSS feed. The signed-in session is what
// authorises this server-side.
export async function refreshNews() {
  const res = await fetch("/api/news/refresh", { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Refresh failed (${res.status})`);
  return body;
}
