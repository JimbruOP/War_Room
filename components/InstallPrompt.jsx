"use client";

import { useEffect, useState } from "react";
import { Download, Share, X as XIcon } from "lucide-react";

const DISMISS_KEY = "wr-install-dismissed";

// Prompts the user to add the app to their home screen.
// - Android / desktop Chrome: fires the native install dialog via the captured
//   beforeinstallprompt event.
// - iOS Safari: no install API exists, so we show the manual Share → Add to
//   Home Screen steps instead.
// Hidden once installed (standalone) or dismissed.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [mode, setMode] = useState(null); // "android" | "ios" | null

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (standalone) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {}

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isIos) {
      setMode("ios");
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setMode(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
    dismiss();
  }

  if (!mode) return null;

  return (
    <div className="install-bar">
      <div className="install-icon">
        {mode === "ios" ? <Share size={16} /> : <Download size={16} />}
      </div>
      <div className="install-text">
        {mode === "ios" ? (
          <>
            <b>Install War Room</b> — tap <Share size={12} style={{ verticalAlign: "-2px" }} /> Share,
            then “Add to Home Screen” for background alerts.
          </>
        ) : (
          <>
            <b>Install War Room</b> on your phone for background alerts.
          </>
        )}
      </div>
      {mode === "android" && (
        <button className="install-btn" onClick={install}>
          Install
        </button>
      )}
      <button className="install-x" onClick={dismiss} aria-label="Dismiss">
        <XIcon size={16} />
      </button>
    </div>
  );
}
