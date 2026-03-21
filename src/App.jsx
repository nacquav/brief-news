import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { supabase, getSessionId, hasSeenOnboarding, markOnboardingDone } from "./supabase";

const TABS = [
  { label: "For You",   category: "general" },
  { label: "Tech",      category: "technology" },
  { label: "Markets",   category: "business" },
  { label: "Science",   category: "science" },
  { label: "Health",    category: "health" },
];

const CATEGORY_COLORS = {
  general:    "#00C4A8",
  technology: "#00C4A8",
  business:   "#F59E0B",
  science:    "#10B981",
  health:     "#6366F1",
};

const CATEGORY_LABELS = {
  general:    "TOP STORY",
  technology: "TECHNOLOGY",
  business:   "MARKETS",
  science:    "SCIENCE",
  health:     "HEALTH",
};

const LEAN_BARS = [
  { key: "Left",         color: "#3B82F6" },
  { key: "Center-Left",  color: "#60A5FA" },
  { key: "Center",       color: "#9CA3AF" },
  { key: "Center-Right", color: "#F97316" },
  { key: "Right",        color: "#EF4444" },
];

const CATEGORY_LIST = ["general","technology","business","science","health"];

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diff < 60) return `${diff} min ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

async function fetchSummary(title, description, content, url) {
  const params = new URLSearchParams();
  if (title) params.append("title", title);
  if (description) params.append("description", description);
  if (content) params.append("content", content);
  if (url) params.append("url", url);
  const res = await fetch(`/api/summary?${params.toString()}`);
  const data = await res.json();
  return data.summary || null;
}

async function fetchCorroboration(title) {
  const params = new URLSearchParams();
  params.append("title", title);
  const res = await fetch(`/api/corroborate?${params.toString()}`);
  const data = await res.json();
  return data.score || null;
}

async function trackRead(category, corroboration) {
  try {
    const sessionId = getSessionId();
    const counts = corroboration?.counts || {};
    const { data, error } = await supabase.from("article_reads").insert({
      session_id: sessionId,
      category,
      lean_left:         counts["Left"]         || 0,
      lean_center_left:  counts["Center-Left"]  || 0,
      lean_center:       counts["Center"]        || 0,
      lean_center_right: counts["Center-Right"] || 0,
      lean_right:        counts["Right"]         || 0,
    });
  } catch (err) {
    console.error("Track error:", err);
  }
}

function OnboardingScreen({ onDone }) {
  const [slide, setSlide] = useState(0);
  const touchStart = useRef(null);

  const slides = [
    {
      eyebrow: "BUILT DIFFERENTLY",
      accent: "#00C4A8",
    },
    {
      eyebrow: "WHAT MAKES US DIFFERENT",
      accent: "#00C4A8",
    },
    {
      eyebrow: "WHAT'S COMING",
      accent: "#00C4A8",
    },
  ];

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (diff > 50 && slide < slides.length - 1) setSlide(s => s + 1);
    if (diff < -50 && slide > 0) setSlide(s => s - 1);
    touchStart.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed", inset: 0,
        background: "#F5F2ED",
        display: "flex", flexDirection: "column",
        zIndex: 100, overflow: "hidden",
      }}
    >
      {/* Progress bars */}
      <div style={{ display: "flex", gap: 4, padding: "56px 24px 0" }}>
        {slides.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 2, borderRadius: 1, background: i <= slide ? "#00C4A8" : "rgba(0,0,0,0.1)", transition: "background 0.3s" }}/>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "40px 28px 0", overflow: "hidden" }}>

        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 3, color: "#00C4A8", marginBottom: 20 }}>
          {slides[slide].eyebrow}
        </div>

        {/* SLIDE 1 */}
        {slide === 0 && (
          <>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: "#0A0C10", lineHeight: 1.2, marginBottom: 16, fontWeight: 400 }}>
                The news wasn't built for you.
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 56, color: "#0A0C10", letterSpacing: 6, lineHeight: 1 }}>BRIEF</div>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#00C4A8", marginBottom: 6, flexShrink: 0 }}/>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: "#0A0C10", lineHeight: 1 }}> was.</div>
              </div>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              {[
                "Most news apps are designed to keep you scrolling — not to keep you informed.",
                "No algorithm deciding what you see. No outrage bait. No infinite scroll designed to trap you.",
                "Just the world's most important stories — fast, clear, and honest.",
              ].map((para, i) => (
                <p key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: i === 0 ? "#0A0C10" : "#6B7280", lineHeight: 1.7, margin: "0 0 18px 0", fontWeight: i === 0 ? 500 : 400 }}>
                  {para}
                </p>
              ))}
            </div>
          </>
        )}

        {/* SLIDE 2 */}
        {slide === 1 && (
          <>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: "#0A0C10", lineHeight: 1.2, marginBottom: 24, fontWeight: 400 }}>
              News the way it should be.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
              {[
                { icon: "⚡", label: "60s BRIEF", desc: "AI summarizes every story in under a minute. Formatted for humans." },
                { icon: "◎", label: "Bias Score", desc: "See how many sources across the political spectrum covered each story." },
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(0,196,168,0.1)", border: "1px solid rgba(0,196,168,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    {f.icon}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "#0A0C10", marginBottom: 3 }}>{f.label}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mini spider chart */}
            <div style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#9CA3AF", letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>Your Reading Profile</div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <svg width="80" height="80" viewBox="0 0 120 120">
                  {[1,2,3,4].map(l => {
                    const pts = [0,1,2,3,4].map(i => {
                      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                      const d = (l/4) * 42;
                      return `${60 + d * Math.cos(a)},${60 + d * Math.sin(a)}`;
                    }).join(" ");
                    return <polygon key={l} points={pts} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1"/>;
                  })}
                  {[0,1,2,3,4].map(i => {
                    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    return <line key={i} x1="60" y1="60" x2={60 + 42 * Math.cos(a)} y2={60 + 42 * Math.sin(a)} stroke="rgba(0,0,0,0.07)" strokeWidth="1"/>;
                  })}
                  <polygon
                    points={[[0.9,0],[0.5,1],[0.3,2],[0.7,3],[0.6,4]].map(([v,i]) => {
                      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                      const d = v * 42;
                      return `${60 + d * Math.cos(a)},${60 + d * Math.sin(a)}`;
                    }).join(" ")}
                    fill="rgba(0,196,168,0.15)" stroke="#00C4A8" strokeWidth="2"
                  />
                </svg>
                <div style={{ flex: 1 }}>
                  {["Top News","Tech","Markets","Science","Health"].map((label, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#6B7280" }}>{label}</span>
                      <div style={{ width: 40, height: 4, background: "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden", marginTop: 1 }}>
                        <div style={{ height: "100%", width: `${[90,50,30,70,60][i]}%`, background: "#00C4A8", borderRadius: 2 }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* SLIDE 3 */}
        {slide === 2 && (
          <>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: "#0A0C10", lineHeight: 1.2, marginBottom: 20, fontWeight: 400 }}>
              Start reading.
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              {[
                "BRIEF. is built for people who want to stay informed — without being consumed by it.",
                "More is coming soon:",
              ].map((para, i) => (
                <p key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: i === 0 ? "#0A0C10" : "#6B7280", lineHeight: 1.7, margin: "0 0 14px 0" }}>
                  {para}
                </p>
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "AI Bias Detection", desc: "Real-time source classification on every article" },
                  { label: "News DNA Report", desc: "Your monthly reading breakdown — shareable" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00C4A8", flexShrink: 0 }}/>
                    <div>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#0A0C10" }}>{item.label} </span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#6B7280" }}>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Podcast waveform graphic */}
              <div style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#9CA3AF", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>Podcast Briefs — Coming Soon</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,196,168,0.1)", border: "1px solid rgba(0,196,168,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: "10px solid #00C4A8", marginLeft: 2 }}/>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 2, height: 28 }}>
                    {[3,6,10,7,14,9,5,12,8,4,11,7,9,5,13,6,8,10,4,7,11,5,9,6,8,12,4,7,10,5].map((h, i) => (
                      <div key={i} style={{ flex: 1, height: `${h}px`, background: i < 10 ? "#00C4A8" : "rgba(0,196,168,0.25)", borderRadius: 1 }}/>
                    ))}
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#9CA3AF", flexShrink: 0 }}>2:34</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom */}
      <div style={{ padding: "24px 28px 48px", display: "flex", flexDirection: "column", gap: 12 }}>
        {slide < slides.length - 1 ? (
          <button
            onClick={() => setSlide(s => s + 1)}
            style={{ width: "100%", padding: "16px", background: "#0A0C10", border: "none", borderRadius: 14, fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#F5F2ED", fontWeight: 600, cursor: "pointer" }}
          >
            NEXT →
          </button>
        ) : (
          <button
            onClick={onDone}
            style={{ width: "100%", padding: "16px", background: "#00C4A8", border: "none", borderRadius: 14, fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#0A0C10", fontWeight: 600, cursor: "pointer" }}
          >
            ENTER BRIEF. →
          </button>
        )}
        {slide > 0 && (
          <button
            onClick={() => setSlide(s => s - 1)}
            style={{ width: "100%", padding: "10px", background: "none", border: "none", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1, color: "rgba(0,0,0,0.3)", cursor: "pointer" }}
          >
            ← BACK
          </button>
        )}
        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          {slides.map((_, i) => (
            <div key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? 20 : 6, height: 6, borderRadius: 3, background: i === slide ? "#00C4A8" : "rgba(0,0,0,0.15)", transition: "all 0.3s", cursor: "pointer" }}/>
          ))}
        </div>
      </div>
    </div>
  );
}


// ── SPIDER CHART ──
function SpiderChart({ data }) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = 85;
  const axes = [
    { key: "general",    label: "Top News"  },
    { key: "technology", label: "Tech"      },
    { key: "business",   label: "Markets"   },
    { key: "science",    label: "Science"   },
    { key: "health",     label: "Health"    },
  ];
  const n = axes.length;
  const max = Math.max(...Object.values(data), 1);
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const gridPoly = (level) =>
    axes.map((_, i) => {
      const a = angle(i);
      const d = (level / 4) * r;
      return `${cx + d * Math.cos(a)},${cy + d * Math.sin(a)}`;
    }).join(" ");

  const dataPoly = axes.map((ax, i) => {
    const a = angle(i);
    const d = ((data[ax.key] || 0) / max) * r;
    return `${cx + d * Math.cos(a)},${cy + d * Math.sin(a)}`;
  }).join(" ");

  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`}>
      {[1, 2, 3, 4].map(l => (
        <polygon key={l} points={gridPoly(l)} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1"/>
      ))}
      {axes.map((_, i) => {
        const a = angle(i);
        return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="rgba(0,0,0,0.07)" strokeWidth="1"/>;
      })}
      <polygon points={dataPoly} fill="rgba(0,196,168,0.15)" stroke="#00C4A8" strokeWidth="2"/>
      {axes.map((ax, i) => {
        const a = angle(i);
        const d = ((data[ax.key] || 0) / max) * r;
        return <circle key={i} cx={cx + d * Math.cos(a)} cy={cy + d * Math.sin(a)} r="5" fill="#00C4A8" stroke="white" strokeWidth="2"/>;
      })}
      {axes.map((ax, i) => {
        const a = angle(i);
        const labelR = r + 26;
        const lx = cx + labelR * Math.cos(a);
        const ly = cy + labelR * Math.sin(a);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fontFamily="DM Mono, monospace" fill="rgba(0,0,0,0.5)" letterSpacing="0.5">
            {ax.label.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}


// ── LEAN BAR CHART ──
function LeanChart({ leanData }) {
  const bars = [
    { key: "left",         label: "Left",    color: "#3B82F6" },
    { key: "center_left",  label: "C-Left",  color: "#60A5FA" },
    { key: "center",       label: "Center",  color: "#9CA3AF" },
    { key: "center_right", label: "C-Right", color: "#F97316" },
    { key: "right",        label: "Right",   color: "#EF4444" },
  ];
  const total = Math.max(Object.values(leanData).reduce((a, b) => a + b, 0), 1);
  const maxVal = Math.max(...bars.map(b => leanData[b.key] || 0), 1);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, marginBottom: 8 }}>
        {bars.map(b => {
          const val = leanData[b.key] || 0;
          const pct = (val / maxVal) * 100;
          return (
            <div key={b.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 4 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: b.color }}>{val}</span>
              <div style={{
                width: "100%",
                height: `${Math.max(pct, 3)}%`,
                background: b.color,
                borderRadius: "3px 3px 0 0",
                opacity: val === 0 ? 0.15 : 1,
              }}/>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {bars.map(b => (
          <div key={b.key} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: b.color, letterSpacing: 0.3 }}>{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PROFILE PAGE ──
function ProfilePage() {
  const [reads, setReads] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const sessionId = getSessionId();
      const { data, error } = await supabase
        .from("article_reads")
        .select("*")
        .eq("session_id", sessionId);

      if (error || !data) { setLoading(false); return; }

      const catCounts = {};
      CATEGORY_LIST.forEach(c => catCounts[c] = 0);
      data.forEach(row => {
        if (catCounts[row.category] !== undefined) catCounts[row.category]++;
      });

      const lean = { left: 0, center_left: 0, center: 0, center_right: 0, right: 0 };
      data.forEach(row => {
        lean.left         += row.lean_left || 0;
        lean.center_left  += row.lean_center_left || 0;
        lean.center       += row.lean_center || 0;
        lean.center_right += row.lean_center_right || 0;
        lean.right        += row.lean_right || 0;
      });

      setReads({ total: data.length, catCounts, lean });
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#F5F2ED", padding: "24px 20px" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#0A0C10", letterSpacing: 4 }}>
          YOUR BRIEF<span style={{ color: "#00C4A8" }}>.</span>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#9CA3AF", letterSpacing: 1, marginTop: 4 }}>
          READING PROFILE
        </div>
        <button
          onClick={() => {
            localStorage.removeItem("brief_onboarding_done");
            window.location.reload();
          }}
          style={{ marginTop: 12, background: "none", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: "6px 12px", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1, color: "#9CA3AF", cursor: "pointer" }}
        >
          VIEW INTRO →
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", paddingTop: 60, fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#9CA3AF", letterSpacing: 2 }}>
          LOADING...
        </div>
      ) : !reads || reads.total === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>📰</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#0A0C10", marginBottom: 8 }}>No reads yet</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#9CA3AF", lineHeight: 1.6 }}>
            Generate a brief or tap Read Full Story to start building your profile.
          </div>
        </div>
      ) : (
        <>
          <div style={{ background: "rgba(0,196,168,0.06)", border: "1px solid rgba(0,196,168,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#6B7280", letterSpacing: 1 }}>STORIES READ</span>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: "#00C4A8", letterSpacing: 2 }}>{reads.total}</span>
          </div>

          <div style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 16, padding: "20px 16px", marginBottom: 16 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#9CA3AF", letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" }}>Topic Breakdown</div>
            <SpiderChart data={reads.catCounts} />
          </div>

          <div style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 16, padding: "20px 16px", marginBottom: 16 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#9CA3AF", letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" }}>Source Lean Distribution</div>
            <LeanChart leanData={reads.lean} />
          </div>

          <div style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 16, padding: "20px 16px" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#9CA3AF", letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" }}>By Category</div>
            {Object.entries(reads.catCounts).map(([cat, count]) => {
              const pct = Math.round((count / reads.total) * 100);
              const color = CATEGORY_COLORS[cat];
              return (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6B7280", letterSpacing: 1, textTransform: "uppercase" }}>{CATEGORY_LABELS[cat]}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color }}>{count} · {pct}%</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.6s ease" }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}


function BottomSheet({ children, onClose }) {
  const sheetRef = useRef(null);
  const dragStart = useRef(null);
  const [translateY, setTranslateY] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleTouchStart = (e) => {
    dragStart.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (dragStart.current === null) return;
    const diff = e.touches[0].clientY - dragStart.current;
    if (diff > 0) setTranslateY(diff);
  };

  const handleTouchEnd = () => {
    if (translateY > 80) {
      setVisible(false);
      setTimeout(onClose, 300);
    } else {
      setTranslateY(0);
    }
    dragStart.current = null;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(10,12,16,0.4)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s ease",
          zIndex: 10,
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "absolute",
          left: 0, right: 0, bottom: 0,
          background: "#F5F2ED",
          borderRadius: "20px 20px 0 0",
          padding: "0 20px 32px",
          zIndex: 11,
          transform: `translateY(${visible ? translateY : 100}%)`,
          transition: translateY > 0 ? "none" : "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          maxHeight: "82%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 16px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.15)" }}/>
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexShrink: 0 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#00C4A8", letterSpacing: 2 }}>⚡ 60s BRIEF</span>
          <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
            style={{ background: "none", border: "none", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#9CA3AF", cursor: "pointer", letterSpacing: 1 }}>
            CLOSE ×
          </button>
        </div>

        {/* Scrollable content */}
        <div
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
          style={{ flex: 1, overflow: "auto" }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

// ── WHAT'S CIRCULATING ──
const NOISE_CONFIG = {
  signal: { label: "Substance", color: "#00C4A8", desc: "A real story with legs." },
  high:   { label: "Mixed",  color: "#F59E0B", desc: "Potential real story, inflated noise." },
  noise:  { label: "Noise",  color: "#EF4444", desc: "Viral moment, low substance." },
};

function NoiseBar({ rating }) {
  const cfg = NOISE_CONFIG[rating] || NOISE_CONFIG.high;
  const width = rating === "signal" ? "20%" : rating === "high" ? "60%" : "95%";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1.5, color: "#9CA3AF", textTransform: "uppercase", minWidth: 70 }}>Noise level</span>
      <div style={{ flex: 1, height: 3, background: "rgba(0,0,0,0.08)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width, height: "100%", background: cfg.color, borderRadius: 2, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }}/>
      </div>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1, color: cfg.color, minWidth: 38, textAlign: "right" }}>{cfg.label}</span>
    </div>
  );
}

function TrendCard({ trend, index }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = NOISE_CONFIG[trend.noiseRating] || NOISE_CONFIG.high;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: "white",
        border: `1px solid ${expanded ? cfg.color + "44" : "rgba(0,0,0,0.07)"}`,
        borderLeft: `3px solid ${expanded ? cfg.color : "rgba(0,0,0,0.08)"}`,
        borderRadius: 12,
        padding: "16px 18px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 2, color: "#9CA3AF", textTransform: "uppercase" }}>Circulating</span>
            <span style={{ color: "rgba(0,0,0,0.2)", fontSize: 10 }}>·</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#9CA3AF" }}>{trend.timeAgo}</span>
          </div>

          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: "#0A0C10", lineHeight: 1.25, marginBottom: 10, letterSpacing: "-0.01em" }}>
            {trend.term}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Spike indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <polyline points="1,11 4,7 7,9 10,3 13,5" stroke="#00C4A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#00C4A8", letterSpacing: 1 }}>{trend.spike}% spike</span>
            </div>
            <span style={{ color: "rgba(0,0,0,0.15)", fontSize: 10 }}>·</span>
            {trend.crossSources.map(s => (
              <span key={s} style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 0.5, color: "#6B7280", background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>{s}</span>
            ))}
          </div>
        </div>

        {/* Expand button */}
        <div style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 0.2s ease", transform: expanded ? "rotate(45deg)" : "rotate(0deg)" }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line x1="5" y1="1" x2="5" y2="9" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="1" y1="5" x2="9" y2="5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, lineHeight: 1.7, color: "#374151", margin: "0 0 10px 0" }}>
            {trend.brief}
          </p>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: cfg.color, letterSpacing: 1, opacity: 0.85 }}>
            {cfg.desc}
          </div>
          <NoiseBar rating={trend.noiseRating} />
        </div>
      )}
    </div>
  );
}

function CirculatingScreen() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/circulating");
      const data = await res.json();
      setTrends(data.trends || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Circulating fetch error:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTrends(); }, []);

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#F5F2ED", padding: "20px 20px 40px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "#0A0C10", letterSpacing: "-0.02em", marginBottom: 4 }}>
            What's Circulating
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#9CA3AF", margin: 0, lineHeight: 1.5 }}>
            Viral signals decoded. No doom scrolling required.
          </p>
        </div>
        <button
          onClick={fetchTrends}
          style={{ background: "none", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: "7px 12px", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1, color: "#6B7280", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, textTransform: "uppercase" }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M8 4.5A3.5 3.5 0 1 1 4.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <polyline points="4.5,1 6.5,1 6.5,3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        {Object.entries(NOISE_CONFIG).map(([key, cfg]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color }}/>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6B7280", letterSpacing: 1 }}>{cfg.label}</span>
          </div>
        ))}
        {lastRefresh && (
          <span style={{ marginLeft: "auto", fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#D1D5DB" }}>
            {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: "white", borderRadius: 12, padding: "16px 18px", border: "1px solid rgba(0,0,0,0.07)" }}>
              <div style={{ height: 10, background: "rgba(0,0,0,0.06)", borderRadius: 4, width: "40%", marginBottom: 10 }}/>
              <div style={{ height: 16, background: "rgba(0,0,0,0.06)", borderRadius: 4, width: "75%", marginBottom: 8 }}/>
              <div style={{ height: 10, background: "rgba(0,0,0,0.04)", borderRadius: 4, width: "55%" }}/>
            </div>
          ))}
        </div>
      )}

      {/* Trends */}
      {!loading && trends.length === 0 && (
        <div style={{ textAlign: "center", paddingTop: 40 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "#0A0C10", marginBottom: 8 }}>Nothing circulating yet</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#9CA3AF" }}>Tap refresh to check trending signals.</div>
        </div>
      )}

      {!loading && trends.map((trend, i) => (
        <TrendCard key={trend.id} trend={trend} index={i} />
      ))}

{!loading && trends.length > 0 && (
        <p style={{ marginTop: 24, fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#D1D5DB", lineHeight: 1.6, letterSpacing: 1, textAlign: "center" }}>
          Signals sourced from Reddit r/all · Briefs generated by AI<br/>Always verify primary sources
        </p>
      )}
    </div>
  );
}


// ── NEWS CARD ──
function NewsCard({ item, color, label, category }) {
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [corroboration, setCorroboration] = useState(null);
  const [corrobLoading, setCorrobLoading] = useState(true);
  const hasTracked = useRef(false);

  useEffect(() => {
    fetchCorroboration(item.title).then(score => {
      setCorroboration(score);
      setCorrobLoading(false);
    });
  }, [item.title]);

  const handleSummary = async () => {
    setShowSummary(true);
    if (summary) return;
    setSummaryLoading(true);
    if (!hasTracked.current) {
      hasTracked.current = true;
      trackRead(category, corroboration);
    }
    try {
      const result = await fetchSummary(item.title, item.description, item.content, item.url);
      setSummary(result || "Summary unavailable for this article.");
    } catch (err) {
      setSummary("Summary unavailable for this article.");
    }
    setSummaryLoading(false);
  };

  const LEAN_COLORS = {
    "Left": "#3B82F6",
    "Center-Left": "#60A5FA",
    "Center": "#9CA3AF",
    "Center-Right": "#F97316",
    "Right": "#EF4444",
  };

  return (
    <div style={{
      height: "100%", width: "100%",
      display: "flex", flexDirection: "column",
      background: "#F5F2ED", boxSizing: "border-box", overflow: "hidden",
      position: "relative",
    }}>

      {/* Image */}
      {item.urlToImage && (
        <div style={{ width: "100%", height: "160px", flexShrink: 0, overflow: "hidden", background: "#E8E4DD" }}>
          <img
            src={item.urlToImage} alt={item.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
            onError={e => { e.target.parentElement.style.display = "none"; }}
          />
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px 14px", overflow: "hidden" }}>

        {/* Category left — Source right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }}/>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2.5, color, fontWeight: 500 }}>{label}</span>
          </div>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#0A0C10" }}>
            {item.source?.name}
          </span>
        </div>

        {/* Headline */}
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: item.urlToImage ? 17 : 22, fontWeight: 400, color: "#0A0C10", lineHeight: 1.25, margin: "0 0 8px 0", letterSpacing: "-0.3px" }}>
          {item.title}
        </h2>

        {/* Accent rule */}
        <div style={{ width: 32, height: 2, background: color, borderRadius: 1, marginBottom: 10, flexShrink: 0 }}/>

        {/* Description */}
        <div style={{ flex: 1, overflow: "hidden", marginBottom: 12 }}>
          {item.description && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#6B7280", lineHeight: 1.6, margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: item.urlToImage ? 5 : 8, WebkitBoxOrient: "vertical" }}>
              {item.description}
            </p>
          )}
        </div>

        {/* Time + Bias pill + Bar chart */}
        <div style={{ marginBottom: 12, flexShrink: 0 }}>

          {/* Time + lean pill row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#9CA3AF" }}>
              {timeAgo(item.publishedAt)}
            </span>
            {corrobLoading ? (
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#D1D5DB", letterSpacing: 1 }}>CHECKING...</span>
            ) : corroboration ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 20, padding: "3px 10px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: LEAN_COLORS[corroboration.lean] || "#9CA3AF" }}/>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6B7280", letterSpacing: 0.5 }}>
                  {corroboration.lean || "Center"}
                </span>
              </div>
            ) : null}
          </div>

          {/* Full width bar chart */}
          {!corrobLoading && corroboration && (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 32, padding: "0 2px" }}>
                {LEAN_BARS.map(({ key, color: barColor }) => (
                  <div key={key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 3 }}>
                    <div style={{
                      width: "100%",
                      height: corroboration.counts[key] > 0 ? Math.min(Math.max(corroboration.counts[key] * 5, 4), 26) : 3,
                      background: corroboration.counts[key] > 0 ? barColor : "rgba(0,0,0,0.06)",
                      borderRadius: "2px 2px 0 0",
                    }}/>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: corroboration.counts[key] > 0 ? barColor : "rgba(0,0,0,0.2)" }}>
                      {key === "Center-Left" ? "C-L" : key === "Center-Right" ? "C-R" : key.slice(0, 1)}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "right", marginTop: 3 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#C4C4C4", letterSpacing: 0.5 }}>
                  {corroboration.total} SOURCES
                </span>
              </div>
            </>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={handleSummary} style={{ flex: 1, padding: "9px 8px", background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1, color: "#6B7280", cursor: "pointer", transition: "all 0.2s", lineHeight: 1.3 }}>
            ⚡ AI BRIEF
          </button>
          <a href={item.url} target="_blank" rel="noreferrer"
            onClick={() => {
              if (!hasTracked.current) { hasTracked.current = true; trackRead(category, corroboration); }
            }}
            style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", padding: "9px", background: "#0A0C10", color: "#F5F2ED", borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, textDecoration: "none", letterSpacing: "0.3px" }}>
            Read Full Story →
          </a>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: item.title, text: `${item.title}\n\nvia BRIEF.`, url: item.url });
              } else {
                navigator.clipboard.writeText(`${item.title}\n\n${item.url}\n\nvia BRIEF.`);
                alert("Link copied to clipboard!");
              }
            }}
            style={{ padding: "9px 13px", background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ↗
          </button>
        </div>
      </div>

      {/* Bottom sheet */}
      {showSummary && (
        <BottomSheet onClose={() => setShowSummary(false)}>
          {summaryLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "24px 0" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00C4A8" }}/>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#00C4A8", letterSpacing: 1 }}>SUMMARIZING...</span>
            </div>
          ) : (
            <ReactMarkdown components={{
              p: ({ children }) => <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#374151", lineHeight: 1.7, margin: "0 0 12px 0" }}>{children}</p>,
              strong: ({ children }) => <strong style={{ color: "#0A0C10", fontWeight: 600 }}>{children}</strong>,
              ul: ({ children }) => <ul style={{ paddingLeft: 16, margin: "6px 0" }}>{children}</ul>,
              li: ({ children }) => <li style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#374151", lineHeight: 1.65, marginBottom: 6 }}>{children}</li>,
              h3: ({ children }) => <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1.5, color: "#00C4A8", textTransform: "uppercase", marginBottom: 6, marginTop: 10 }}>{children}</div>,
            }}>{summary}</ReactMarkdown>
          )}
        </BottomSheet>
      )}
    </div>
  );
}



// ── MAIN APP ──
export default function App() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(0);
  const [screen, setScreen] = useState("feed");
  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding());
  const [showCirculating, setShowCirculating] = useState(false);

  const handleOnboardingDone = () => {
    markOnboardingDone();
    setShowOnboarding(false);
  };

  
  const containerRef = useRef(null);
  const touchStart = useRef(null);
  const touchLocked = useRef(false);
  const articlesRef = useRef([]);

  useEffect(() => { articlesRef.current = articles; }, [articles]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setCurrent(0);
    fetch(`/api/news?category=${activeTab.category}`)
      .then(r => r.json())
      .then(data => {
        if (data.status !== "ok") throw new Error(data.message);
        setArticles(data.articles.filter(a => {
          if (!a.title || a.title === "[Removed]" || !a.urlToImage) return false;
          if (!a.description || a.description.length < 20) return false;
          if (/<[^>]*>/.test(a.description)) return false;
          return true;
        }))
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [activeTab]);

  const navigate = (dir) => {
    if (touchLocked.current) return;
    touchLocked.current = true;
    setCurrent(c => Math.max(0, Math.min(c + dir, articlesRef.current.length - 1)));
    setTimeout(() => { touchLocked.current = false; }, 700);
  };

  const handleTouchStart = (e) => {
    if (touchLocked.current) return;
    touchStart.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStart.current === null || touchLocked.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientY;
    touchStart.current = null;
    if (Math.abs(diff) > 50) navigate(diff > 0 ? 1 : -1);
  };

  const color = CATEGORY_COLORS[activeTab.category];

  return (
    <div style={{ background: "#F5F2ED", minHeight: "100dvh", display: "flex", justifyContent: "center", alignItems: "flex-start", fontFamily: "sans-serif" }}>
      {showOnboarding && <OnboardingScreen onDone={handleOnboardingDone} />}

      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;600&display=swap" rel="stylesheet"/>
      <div style={{ width: "100%", maxWidth: 480, height: "100dvh", background: "#F5F2ED", borderRadius: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        

        {/* Header */}
        <div style={{ padding: "18px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F5F2ED", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: "#0A0C10", letterSpacing: 5, lineHeight: 1 }}>
            BRIEF<span style={{ color: "#00C4A8" }}>.</span>
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#9CA3AF" }}>
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        {/* Tabs — only show on feed */}
        {screen === "feed" && (
          <div style={{ display: "flex", padding: "10px 16px 0", borderBottom: "1px solid rgba(0,0,0,0.08)", overflowX: "auto", scrollbarWidth: "none", background: "#F5F2ED", flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t.label} onClick={() => { setActiveTab(t); setShowCirculating(false); }} style={{ background: "none", border: "none", color: activeTab.label === t.label && !showCirculating ? "#0A0C10" : "#9CA3AF", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1.5, padding: "6px 10px 10px", borderBottom: activeTab.label === t.label && !showCirculating ? `2px solid ${CATEGORY_COLORS[t.category]}` : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap", fontWeight: activeTab.label === t.label && !showCirculating ? 500 : 400, transition: "all 0.2s" }}>
                {t.label.toUpperCase()}
              </button>
            ))}
            <button onClick={() => setShowCirculating(true)} style={{ background: "none", border: "none", color: showCirculating ? "#00C4A8" : "#9CA3AF", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1.5, padding: "6px 10px 10px", borderBottom: showCirculating ? "2px solid #00C4A8" : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap", fontWeight: showCirculating ? 500 : 400, transition: "all 0.2s" }}>
              CIRCULATING
            </button>
          </div>
        )}

        {/* Screen content */}
        {screen === "profile" ? (
          <ProfilePage />
        ) : showCirculating ? (
          <CirculatingScreen />
        ) : (

          <div ref={containerRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ flex: 1, overflow: "hidden", position: "relative", background: "#F5F2ED" }}>
            {loading && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#9CA3AF", letterSpacing: 2 }}>LOADING...</div>
            )}
            {error && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EF4444" }}>{error}</div>
            )}
            {!loading && !error && articles.length > 0 && (
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                {articles.map((item, i) => (
                  <div key={i} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, transform: `translateY(${(i - current) * 100}%)`, transition: "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)" }}>
                    <NewsCard
                      item={item}
                      color={color}
                      label={CATEGORY_LABELS[activeTab.category]}
                      category={activeTab.category}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dots — only on feed */}
        {screen === "feed" && !showCirculating && articles.length > 0 && !loading && (
          <div style={{ display: "flex", justifyContent: "center", gap: 5, padding: "8px 0", background: "#F5F2ED", flexShrink: 0 }}>
            {articles.map((_, i) => (
              <div key={i} onClick={() => navigate(i - current)} style={{ width: i === current ? 20 : 5, height: 5, borderRadius: 3, background: i === current ? color : "rgba(0,0,0,0.15)", cursor: "pointer", transition: "all 0.3s" }}/>
            ))}
          </div>
        )}

        {/* Bottom nav */}
        <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 0 28px", borderTop: "1px solid rgba(0,0,0,0.08)", background: "#F5F2ED", flexShrink: 0 }}>
          {[["⚡","Feed","feed"],["🔍","Search","feed"],["🔖","Saved","feed"],["◎","Profile","profile"]].map(([icon, label, target]) => (
            <button key={label} onClick={() => setScreen(target)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", color: screen === target && target === "profile" ? "#00C4A8" : label === "Feed" && screen === "feed" ? "#0A0C10" : "#9CA3AF" }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 0.5 }}>{label}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}