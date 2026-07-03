import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Layers, ListChecks, NotebookPen, Send, RotateCw, ChevronLeft, ChevronRight, Check, X, Sparkles, AlertCircle } from "lucide-react";

import { supabase } from "./supabaseClient";
import { C, FONT_IMPORT } from "./theme";
import Auth from "./Auth";

const API_BASE = "http://localhost:8000";

const TABS = [
  { id: "explain", label: "Explain", icon: MessageCircle },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "quiz", label: "Quiz", icon: ListChecks },
  { id: "notes", label: "Notes", icon: NotebookPen },
];

// ---- API helper ----
async function callApi(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  return res.json();
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      className="flex items-start gap-2 px-4 py-3 rounded-lg text-sm mb-4"
      style={{ backgroundColor: "rgba(226,114,91,0.15)", border: `1px solid ${C.coral}`, color: C.ink, fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <AlertCircle size={16} style={{ color: C.coral, flexShrink: 0, marginTop: 2 }} />
      <span>{message} — is the backend running at <code>{API_BASE}</code>?</span>
    </div>
  );
}

function TabButton({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 w-full text-left"
      style={{
        backgroundColor: active ? C.surfaceRaised : "transparent",
        color: active ? C.yellow : C.inkMuted,
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontWeight: 500,
        fontSize: "14px",
      }}
    >
      <Icon size={17} strokeWidth={2} />
      {tab.label}
    </button>
  );
}

// ---- Explain / Chat view ----
function ExplainView() {
  const [messages, setMessages] = useState([
    { role: "buddy", text: "Ask me about anything you're studying — I'll explain it in plain terms." },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = async () => {
    if (!input.trim() || thinking) return;
    const topic = input.trim();
    setMessages((m) => [...m, { role: "student", text: topic }]);
    setInput("");
    setThinking(true);
    setError(null);
    try {
      const data = await callApi("/explain", { topic, level: "beginner" });
      setMessages((m) => [...m, { role: "buddy", text: data.explanation }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {error && <ErrorBanner message={error} />}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "student" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[75%] px-4 py-3 rounded-2xl"
              style={{
                backgroundColor: m.role === "student" ? C.surfaceRaised : C.blue,
                color: m.role === "student" ? C.ink : "#152018",
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: "14.5px",
                lineHeight: 1.55,
                borderTopRightRadius: m.role === "student" ? 4 : 16,
                borderTopLeftRadius: m.role === "buddy" ? 4 : 16,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl flex gap-1.5 items-center" style={{ backgroundColor: C.blue, borderTopLeftRadius: 4 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "#152018", animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="px-5 py-4 flex gap-2" style={{ borderTop: `1px solid ${C.hairline}` }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about anything you're stuck on…"
          className="flex-1 px-4 py-2.5 rounded-lg outline-none"
          style={{ backgroundColor: C.surfaceRaised, color: C.ink, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "14px" }}
        />
        <button onClick={send} className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: C.yellow, color: "#152018" }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ---- Flashcards view ----
function FlashcardsView() {
  const [topic, setTopic] = useState("");
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await callApi("/generate-flashcards", { topic: topic.trim(), count: 8 });
      setCards(data.cards);
      setIdx(0);
      setFlipped(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const go = (dir) => {
    setFlipped(false);
    setIdx((i) => (i + dir + cards.length) % cards.length);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 flex gap-2">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder="Topic to build flashcards on…"
          className="flex-1 px-4 py-2.5 rounded-lg outline-none"
          style={{ backgroundColor: C.surfaceRaised, color: C.ink, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "14px" }}
        />
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm shrink-0"
          style={{ backgroundColor: C.yellow, color: "#152018", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, opacity: loading ? 0.6 : 1 }}
        >
          <Sparkles size={15} /> {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        {error && <ErrorBanner message={error} />}
        {!error && cards.length === 0 && !loading && (
          <div style={{ color: C.inkMuted, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
            Enter a topic above and generate a deck.
          </div>
        )}

        {cards.length > 0 && (
          <>
            <div className="text-xs tracking-widest uppercase" style={{ color: C.inkMuted, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.15em" }}>
              Card {idx + 1} / {cards.length}
            </div>

            <div className="relative" style={{ width: 340, height: 220, perspective: 1200 }}>
              <div
                onClick={() => setFlipped((f) => !f)}
                className="absolute inset-0 cursor-pointer transition-transform duration-500"
                style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
              >
                <div
                  className="absolute inset-0 flex flex-col rounded-xl px-7 py-6"
                  style={{
                    backgroundColor: C.ink,
                    backfaceVisibility: "hidden",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                    backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(122,110,80,0.15) 28px)",
                  }}
                >
                  <div className="flex gap-1.5 mb-3" aria-hidden="true">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: C.bg, opacity: 0.15 }} />
                    ))}
                  </div>
                  <div className="flex-1 flex items-center justify-center text-center">
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "#182922", fontWeight: 600 }}>
                      {cards[idx].front}
                    </span>
                  </div>
                  <div className="text-center text-[11px] uppercase tracking-wider" style={{ color: "#8A7A55", fontFamily: "'IBM Plex Mono', monospace" }}>
                    Tap to reveal
                  </div>
                </div>

                <div
                  className="absolute inset-0 flex flex-col items-center justify-center text-center rounded-xl px-7 py-6"
                  style={{ backgroundColor: C.surfaceRaised, transform: "rotateY(180deg)", backfaceVisibility: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.35)", border: `1px solid ${C.yellow}` }}
                >
                  <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "15px", lineHeight: 1.6, color: C.ink }}>
                    {cards[idx].back}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <button onClick={() => go(-1)} style={{ color: C.inkMuted }}>
                <ChevronLeft size={22} />
              </button>
              <button onClick={() => setFlipped((f) => !f)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: C.surfaceRaised, color: C.yellow, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                <RotateCw size={14} /> Flip
              </button>
              <button onClick={() => go(1)} style={{ color: C.inkMuted }}>
                <ChevronRight size={22} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Quiz view ----
function QuizView() {
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await callApi("/generate-quiz", { topic: topic.trim(), num_questions: 5, difficulty: "medium" });
      setQuestions(data.questions);
      setIdx(0);
      setSelected(null);
      setScore(0);
      setDone(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const pick = (i) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === questions[idx].answer_index) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 flex gap-2">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder="Topic to quiz yourself on…"
          className="flex-1 px-4 py-2.5 rounded-lg outline-none"
          style={{ backgroundColor: C.surfaceRaised, color: C.ink, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "14px" }}
        />
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm shrink-0"
          style={{ backgroundColor: C.yellow, color: "#152018", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, opacity: loading ? 0.6 : 1 }}
        >
          <Sparkles size={15} /> {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      <div className="flex-1 px-8 py-6 overflow-y-auto">
        {error && <ErrorBanner message={error} />}

        {!error && questions.length === 0 && !loading && (
          <div className="h-full flex items-center justify-center" style={{ color: C.inkMuted, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
            Enter a topic above and generate a quiz.
          </div>
        )}

        {questions.length > 0 && done && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 40, color: C.yellow }}>
              {score}/{questions.length}
            </span>
            <span style={{ color: C.inkMuted, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
              {score === questions.length ? "Clean sweep — nice work." : "Solid attempt. Review the ones you missed."}
            </span>
            <button
              onClick={() => { setIdx(0); setSelected(null); setScore(0); setDone(false); }}
              className="mt-2 px-5 py-2.5 rounded-lg text-sm"
              style={{ backgroundColor: C.yellow, color: "#152018", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
            >
              Retake
            </button>
          </div>
        )}

        {questions.length > 0 && !done && (
          <>
            <div className="flex gap-1.5 mb-8">
              {questions.map((_, i) => (
                <div key={i} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i <= idx ? C.yellow : C.hairline }} />
              ))}
            </div>
            <div className="text-xs uppercase tracking-widest mb-3" style={{ color: C.inkMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
              Question {idx + 1} of {questions.length}
            </div>
            <div className="mb-7" style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: C.ink, fontWeight: 500, lineHeight: 1.35 }}>
              {questions[idx].question}
            </div>
            <div className="flex flex-col gap-2.5">
              {questions[idx].options.map((opt, i) => {
                const isCorrect = i === questions[idx].answer_index;
                const isSelected = i === selected;
                let bg = C.surfaceRaised;
                let border = "transparent";
                let iconEl = null;
                if (selected !== null) {
                  if (isCorrect) {
                    bg = "rgba(232,196,104,0.15)";
                    border = C.yellow;
                    iconEl = <Check size={16} style={{ color: C.yellow }} />;
                  } else if (isSelected) {
                    bg = "rgba(226,114,91,0.15)";
                    border = C.coral;
                    iconEl = <X size={16} style={{ color: C.coral }} />;
                  }
                }
                return (
                  <button
                    key={i}
                    onClick={() => pick(i)}
                    className="flex items-center justify-between px-4 py-3.5 rounded-lg text-left transition-colors"
                    style={{ backgroundColor: bg, border: `1px solid ${border}`, color: C.ink, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14.5 }}
                  >
                    {opt}
                    {iconEl}
                  </button>
                );
              })}
            </div>
            {selected !== null && (
              <button
                onClick={next}
                className="mt-6 px-5 py-2.5 rounded-lg text-sm"
                style={{ backgroundColor: C.yellow, color: "#152018", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
              >
                {idx + 1 >= questions.length ? "See score" : "Next question"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---- Notes view ----
function NotesView() {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const summarize = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setSummary(null);
    setError(null);
    try {
      const data = await callApi("/summarize", { notes: text.trim(), max_points: 5 });
      setSummary(data.points);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col px-6 py-5 gap-3" style={{ borderRight: `1px solid ${C.hairline}` }}>
        <span className="text-xs uppercase tracking-widest" style={{ color: C.inkMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
          Paste your notes
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your study notes here…"
          className="flex-1 resize-none outline-none rounded-lg p-4"
          style={{ backgroundColor: C.surfaceRaised, color: C.ink, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, lineHeight: 1.6 }}
        />
        <button
          onClick={summarize}
          disabled={loading}
          className="self-start flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
          style={{ backgroundColor: C.yellow, color: "#152018", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, opacity: loading ? 0.6 : 1 }}
        >
          <Sparkles size={15} /> {loading ? "Summarizing…" : "Summarize"}
        </button>
      </div>
      <div className="flex-1 px-6 py-5">
        <span className="text-xs uppercase tracking-widest" style={{ color: C.inkMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
          Key points
        </span>
        <div className="mt-3">
          {error && <ErrorBanner message={error} />}
          {loading && (
            <div style={{ color: C.inkMuted, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
              Reading through your notes…
            </div>
          )}
          {!loading && summary && (
            <ul className="flex flex-col gap-3">
              {summary.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px]" style={{ backgroundColor: C.blue, color: "#152018", fontFamily: "'IBM Plex Mono', monospace" }}>
                    {i + 1}
                  </span>
                  <span style={{ color: C.ink, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, lineHeight: 1.55 }}>{s}</span>
                </li>
              ))}
            </ul>
          )}
          {!loading && !summary && !error && (
            <div style={{ color: C.inkMuted, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
              Your summary will show up here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudyBuddyApp({ userEmail, onSignOut }) {
  const [tab, setTab] = useState("explain");

  const views = {
    explain: <ExplainView />,
    flashcards: <FlashcardsView />,
    quiz: <QuizView />,
    notes: <NotesView />,
  };

  return (
    <div className="w-full h-screen flex" style={{ backgroundColor: C.bg }}>
      <style>{FONT_IMPORT}</style>

      <div className="w-56 flex flex-col py-5 px-3 shrink-0" style={{ borderRight: `1px solid ${C.hairline}` }}>
        <div className="px-3 mb-6">
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: C.ink, fontWeight: 600 }}>Study Buddy</div>
          <div className="mt-1 text-[11px] uppercase tracking-widest" style={{ color: C.yellow, fontFamily: "'IBM Plex Mono', monospace" }}>
            AI Study Assistant
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {TABS.map((t) => (
            <TabButton key={t.id} tab={t} active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}
        </div>

        <div className="flex-1" />

        <div className="px-3 pt-3" style={{ borderTop: `1px solid ${C.hairline}` }}>
          <div
            className="truncate mb-2 text-[12px]"
            style={{ color: C.inkMuted, fontFamily: "'IBM Plex Sans', sans-serif" }}
            title={userEmail}
          >
            {userEmail}
          </div>
          <button
            onClick={onSignOut}
            className="text-[12px] px-3 py-1.5 rounded-md w-full text-left"
            style={{ backgroundColor: C.surfaceRaised, color: C.coral, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col" style={{ backgroundColor: C.surface }}>
        {views[tab]}
      </div>
    </div>
  );
}

export default function StudyBuddy() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    // Still checking for an existing session — avoid a flash of the login screen
    return <div className="w-full h-screen" style={{ backgroundColor: C.bg }} />;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <StudyBuddyApp
      userEmail={session.user.email}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}
