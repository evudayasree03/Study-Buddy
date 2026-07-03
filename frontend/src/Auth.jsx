import React, { useState } from "react";
import { BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "./supabaseClient";
import { C, FONT_IMPORT } from "./theme";

export default function Auth() {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    setNotice(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setNotice("Check your inbox to confirm your email, then log in.");
        setMode("login");
      }
    }
    setLoading(false);
  };

  return (
    <div className="w-full h-screen flex items-center justify-center" style={{ backgroundColor: C.bg }}>
      <style>{FONT_IMPORT}</style>

      <div className="w-full max-w-sm px-8 py-9 rounded-2xl" style={{ backgroundColor: C.surface, border: `1px solid ${C.hairline}` }}>
        <div className="flex flex-col items-center mb-7">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
            style={{ backgroundColor: C.yellow, color: "#152018" }}
          >
            <BookOpen size={20} />
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: C.ink, fontWeight: 600 }}>
            Study Buddy
          </div>
          <div className="mt-1 text-[13px]" style={{ color: C.inkMuted, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {mode === "login" ? "Log in to continue studying" : "Create an account to get started"}
          </div>
        </div>

        {error && (
          <div
            className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg text-[13px] mb-4"
            style={{ backgroundColor: "rgba(226,114,91,0.15)", border: `1px solid ${C.coral}`, color: C.ink, fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            <AlertCircle size={15} style={{ color: C.coral, flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div
            className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg text-[13px] mb-4"
            style={{ backgroundColor: "rgba(127,168,201,0.15)", border: `1px solid ${C.blue}`, color: C.ink, fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            <CheckCircle2 size={15} style={{ color: C.blue, flexShrink: 0, marginTop: 1 }} />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] uppercase tracking-wider" style={{ color: C.inkMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="px-3.5 py-2.5 rounded-lg outline-none"
              style={{ backgroundColor: C.surfaceRaised, color: C.ink, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] uppercase tracking-wider" style={{ color: C.inkMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="px-3.5 py-2.5 rounded-lg outline-none"
              style={{ backgroundColor: C.surfaceRaised, color: C.ink, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-4 py-2.5 rounded-lg text-sm"
            style={{ backgroundColor: C.yellow, color: "#152018", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>

        <div className="mt-5 text-center text-[13px]" style={{ color: C.inkMuted, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          {mode === "login" ? (
            <>
              New here?{" "}
              <button onClick={() => { setMode("signup"); setError(null); setNotice(null); }} style={{ color: C.yellow, fontWeight: 500 }}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setError(null); setNotice(null); }} style={{ color: C.yellow, fontWeight: 500 }}>
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
