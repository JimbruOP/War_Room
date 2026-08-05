"use client";

import { useEffect, useState } from "react";
import { LogOut, Settings, X as XIcon, Loader2, Check } from "lucide-react";
import OneSignal from "react-onesignal";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const PUSH_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID);

export default function SettingsModal({ email, displayName, onSaveName, onSignOut, onClose }) {
  const [name, setName] = useState(displayName || "");
  const [nameState, setNameState] = useState("idle"); // idle | saving | saved
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  // Read the current push state when the panel opens.
  useEffect(() => {
    if (!PUSH_CONFIGURED) return;
    try {
      const granted = OneSignal?.Notifications?.permission;
      const opted = OneSignal?.User?.PushSubscription?.optedIn;
      setPushOn(Boolean(granted && opted !== false));
    } catch {
      /* SDK not ready */
    }
  }, []);

  async function saveName() {
    setNameState("saving");
    try {
      await onSaveName(name.trim());
      setNameState("saved");
      setTimeout(() => setNameState("idle"), 1800);
    } catch {
      setNameState("idle");
    }
  }

  async function togglePush() {
    if (!PUSH_CONFIGURED) return;
    setPushBusy(true);
    try {
      if (!pushOn) {
        // Turning on: make sure permission is granted, then opt in.
        if (!OneSignal.Notifications.permission) {
          await OneSignal.Notifications.requestPermission();
        }
        await OneSignal.User.PushSubscription.optIn();
        setPushOn(Boolean(OneSignal.Notifications.permission));
      } else {
        await OneSignal.User.PushSubscription.optOut();
        setPushOn(false);
      }
    } catch (e) {
      console.error("[war-room] push toggle failed:", e);
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Settings">
        <div className="modal-head">
          <h3>
            <Settings size={16} /> Settings
          </h3>
          <button className="x" onClick={onClose} aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>

        <div className="field">
          <label>Signed in as</label>
          <div className="set-readonly">{email || "—"}</div>
        </div>

        <div className="field">
          <label htmlFor="set-name">Display name</label>
          <input
            id="set-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <button className="set-save" onClick={saveName} disabled={nameState === "saving"}>
            {nameState === "saving" ? (
              <><Loader2 size={13} className="spin" /> Saving…</>
            ) : nameState === "saved" ? (
              <><Check size={13} /> Saved</>
            ) : (
              "Save name"
            )}
          </button>
        </div>

        <div className="field">
          <label>Push notifications</label>
          {PUSH_CONFIGURED ? (
            <button
              className={`toggle ${pushOn ? "on" : ""}`}
              onClick={togglePush}
              disabled={pushBusy}
              role="switch"
              aria-checked={pushOn}
            >
              <span className="toggle-knob">{pushBusy && <Loader2 size={11} className="spin" />}</span>
              <span className="toggle-text">{pushOn ? "On — you'll get 90+ alerts" : "Off"}</span>
            </button>
          ) : (
            <div className="set-readonly">Not configured</div>
          )}
        </div>

        <button className="signout-btn" onClick={onSignOut}>
          <LogOut size={15} /> Sign out
        </button>

        {!isSupabaseConfigured && (
          <p className="modal-sub" style={{ marginTop: 12 }}>Running in local mode.</p>
        )}
      </div>
    </div>
  );
}
