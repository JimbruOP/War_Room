"use client";

import { useEffect } from "react";
import OneSignal from "react-onesignal";

// Initialises OneSignal web push once, client-side. No-ops when the app id
// isn't set, so local dev without OneSignal keys still works.
let started = false;

export default function PushInit() {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId || started) return;
    started = true;

    OneSignal.init({
      appId,
      // Lets us test on http://localhost during development.
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { scope: "/" },
      serviceWorkerPath: "OneSignalSDKWorker.js",
    })
      .then(() => {
        // Gentle slide-down asking to enable alerts, rather than the blunt
        // native prompt on first load.
        OneSignal.Slidedown.promptPush().catch(() => {});
      })
      .catch((e) => console.error("[war-room] OneSignal init failed:", e));
  }, []);

  return null;
}
