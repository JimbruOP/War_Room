// Sends a web-push alert via OneSignal's REST API when a high-priority story
// lands. Server-side only — uses the REST API key, never exposed to the browser.

const ONESIGNAL_ENDPOINT = "https://onesignal.com/api/v1/notifications";
export const NOTIFY_THRESHOLD = 90;

function authHeader(key) {
  // Newer OneSignal keys are "os_v2_..." and use the "Key" scheme; legacy
  // REST API keys use "Basic".
  return key.startsWith("os_v2_") ? `Key ${key}` : `Basic ${key}`;
}

// `stories` are already filtered to score >= threshold and not-yet-notified.
// One story -> its headline. Several -> a grouped alert, to avoid a burst of
// notifications when many high-priority stories arrive at once.
export async function sendHighPriorityAlerts(stories, siteUrl) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const restKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !restKey || !stories?.length) return { sent: 0, skipped: true };

  let heading, content, url;
  if (stories.length === 1) {
    heading = "🔴 High-priority story";
    content = stories[0].headline;
    url = stories[0].url || siteUrl || undefined;
  } else {
    heading = `🔴 ${stories.length} high-priority stories`;
    content = stories[0].headline + " …and more";
    url = siteUrl || undefined;
  }

  const res = await fetch(ONESIGNAL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(restKey),
    },
    body: JSON.stringify({
      app_id: appId,
      included_segments: ["Subscribed Users"],
      headings: { en: heading },
      contents: { en: content },
      ...(url ? { url } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OneSignal ${res.status}: ${body.slice(0, 200)}`);
  }
  return { sent: stories.length, skipped: false };
}
