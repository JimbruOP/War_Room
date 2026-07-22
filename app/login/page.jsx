"use client";

import { useState } from "react";
import { Radar, Loader2, Mail } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [message, setMessage] = useState("");

  async function sendLink(e) {
    e.preventDefault();
    if (!email.trim()) return;
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setStatus("error");
      setMessage("Login isn't configured yet. Add your Supabase keys to .env.local.");
      return;
    }
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage(`We sent a sign-in link to ${email.trim()}. Check your inbox.`);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">
            <Radar size={20} />
          </div>
          <div>
            <div className="brand-name">WAR ROOM</div>
            <div className="brand-sub">Rapid Response Desk</div>
          </div>
        </div>

        {!isSupabaseConfigured && (
          <p className="auth-note">
            Running in local mode — login is disabled until Supabase keys are added.
          </p>
        )}

        <form onSubmit={sendLink}>
          <div className="field">
            <label htmlFor="email">Team email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@team.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button className="save-btn" type="submit" disabled={status === "sending"}>
            {status === "sending" ? (
              <>
                <Loader2 size={16} className="spin" /> Sending…
              </>
            ) : (
              <>
                <Mail size={16} /> Email me a sign-in link
              </>
            )}
          </button>
        </form>

        {message && (
          <p className={`auth-msg ${status === "error" ? "err" : "ok"}`}>{message}</p>
        )}
      </div>
    </div>
  );
}
