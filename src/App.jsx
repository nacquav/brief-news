import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { supabase, getSessionId } from "./supabase";

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

async function fetchSummary(title, description, content) {
  const params = new URLSearchParams();
  if (title) params.append("title", title);
  if (description) params.append("description", description);
  if (content) params.append("content", content);
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
    console.log("Tracking read:", { sessionId, category, counts });
    const { data, error } = await supabase.from("article_reads").insert({
      session_id: sessionId,
      category,
      lean_left:         counts["Left"]         || 0,
      lean_center_left:  counts["Center-Left"]  || 0,
      lean_center:       counts["Center"]        || 0,
      lean_center_right: counts["Center-Right"] || 0,
      lean_right:        counts["Right"]         || 0,
    });
    console.log("Supabase response:", { data, error });
  } catch (err) {
    console.error("Track error:", err);
  }
}

// ── SPIDER CHART ──
function SpiderChart({ data }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const axes = [
    { key: "general",    label: "Top News",    color: "#00C4A8" },
    { key: "technology", label: "Tech",         color: "#00C4A8" },
    { key: "business",   label: "Markets",      color: "#F59E0B" },
    { key: "science",    label: "Science",      color: "#10B981" },
    { key: "health",     label: "Health",       color: "#6366F1" },
  ];
  const n = axes.length;
  const max = Math.max(...Object.values(data), 1);

  const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const point = (i, val) => {
    const angle = angleFor(i);
    const dist = (val / max) * r;
    return {
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    };
  };

  const gridPoints = (level) =>
    axes.map((_, i) => {
      const angle = angleFor(i);
      const dist = (level / 4) * r;
      return `${cx + dist * Math.cos(angle)},${cy + dist * Math.sin(angle)}`;
    }).join(" ");

  const dataPoints = axes.map((ax, i) => {
    const p = point(i, data[ax.key] || 0);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {[1, 2, 3, 4].map(level => (
        <polygon
          key={level}
          points={gridPoints(level)}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {axes.map((ax, i) => {
        const angle = angleFor(i);
        return (
          <line
            key={ax.key}
            x1={cx} y1={cy}
            x2={cx + r * Math.cos(angle)}
            y2={cy + r * Math.sin(angle)}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={dataPoints}
        fill="rgba(0,196,168,0.15)"
        stroke="#00C4A8"
        strokeWidth="2"
      />

      {/* Data points */}
      {axes.map((ax, i) => {
        const p = point(i, data[ax.key] || 0);
        return (
          <circle
            key={ax.key}
            cx={p.x} cy={p.y}
            r="4"
            fill="#00C4A8"
            stroke="white"
            strokeWidth="1.5"
          />
        );
      })}

      {/* Labels */}
      {axes.map((ax, i) => {
        const angle = angleFor(i);
        const labelR = r + 22;
        const lx = cx + labelR * Math.cos(angle);
        const ly = cy + labelR * Math.sin(angle);
        return (
          <text
            key={ax.key}
            x={lx} y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fontFamily="DM Mono, monospace"
            letterSpacing="0.5"
            fill="#6B7280"
          >
            {ax.label.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}


// ── LEAN BAR CHART ──
function LeanChart({ leanData }) {
  const total = Object.values(leanData).reduce((a, b) => a + b, 0) || 1;
  const bars = [
    { key: "left",         label: "Left",    color: "#3B82F6" },
    { key: "center_left",  label: "C-Left",  color: "#60A5FA" },
    { key: "center",       label: "Center",  color: "#9CA3AF" },
    { key: "center_right", label: "C-Right", color: "#F97316" },
    { key: "right",        label: "Right",   color: "#EF4444" },
  ];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60, marginBottom: 6 }}>
        {bars.map(b => {
          const val = leanData[b.key] || 0;
          const pct = (val / total) * 100;
          return (
            <div key={b.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
              <div style={{
                width: "100%",
                height: `${Math.max(pct, 2)}%`,
                background: b.color,
                borderRadius: "3px 3px 0 0",
                opacity: pct < 1 ? 0.2 : 1,
              }}/>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {bars.map(b => (
          <div key={b.key} style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 7, color: b.color, letterSpacing: 0.3,
            }}>{b.label}</div>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 8, color: "#6B7280",
            }}>{leanData[b.key] || 0}</div>
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

      // Category counts
      const catCounts = {};
      CATEGORY_LIST.forEach(c => catCounts[c] = 0);
      data.forEach(row => {
        if (catCounts[row.category] !== undefined) catCounts[row.category]++;
      });

      // Lean totals
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
    <div style={{
      flex: 1, overflow: "auto",
      background: "#F5F2ED",
      padding: "24px 20px",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 28, color: "#0A0C10", letterSpacing: 4,
        }}>
          YOUR BRIEF<span style={{ color: "#00C4A8" }}>.</span>
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, color: "#9CA3AF", letterSpacing: 1, marginTop: 4,
        }}>READING PROFILE</div>
      </div>

      {loading ? (
        <div style={{
          textAlign: "center", paddingTop: 60,
          fontFamily: "'DM Mono', monospace",
          fontSize: 11, color: "#9CA3AF", letterSpacing: 2,
        }}>LOADING...</div>
      ) : !reads || reads.total === 0 ? (
        <div style={{
          textAlign: "center", paddingTop: 60,
        }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>📰</div>
          <div style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 20, color: "#0A0C10", marginBottom: 8,
          }}>No reads yet</div>
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13, color: "#9CA3AF", lineHeight: 1.6,
          }}>Start scrolling through stories and your reading profile will appear here.</div>
        </div>
      ) : (
        <>
          {/* Total reads */}
          <div style={{
            background: "rgba(0,196,168,0.06)",
            border: "1px solid rgba(0,196,168,0.2)",
            borderRadius: 12, padding: "14px 16px",
            marginBottom: 20,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, color: "#6B7280", letterSpacing: 1,
            }}>STORIES READ</span>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 32, color: "#00C4A8", letterSpacing: 2,
            }}>{reads.total}</span>
          </div>

          {/* Spider chart */}
          <div style={{
            background: "white",
            border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 16, padding: "20px 16px",
            marginBottom: 20,
          }}>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9, color: "#9CA3AF",
              letterSpacing: 2, marginBottom: 16,
              textTransform: "uppercase",
            }}>Topic Breakdown</div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <SpiderChart data={reads.catCounts} />
            </div>
          </div>

          {/* Lean chart */}
          <div style={{
            background: "white",
            border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 16, padding: "20px 16px",
            marginBottom: 20,
          }}>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9, color: "#9CA3AF",
              letterSpacing: 2, marginBottom: 16,
              textTransform: "uppercase",
            }}>Source Lean Distribution</div>
            <LeanChart leanData={reads.lean} />
          </div>

          {/* Category breakdown */}
          <div style={{
            background: "white",
            border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 16, padding: "20px 16px",
          }}>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9, color: "#9CA3AF",
              letterSpacing: 2, marginBottom: 16,
              textTransform: "uppercase",
            }}>By Category</div>
            {Object.entries(reads.catCounts).map(([cat, count]) => {
              const pct = Math.round((count / reads.total) * 100);
              const color = CATEGORY_COLORS[cat];
              return (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    marginBottom: 4,
                  }}>
                    <span style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9, color: "#6B7280",
                      letterSpacing: 1, textTransform: "uppercase",
                    }}>{CATEGORY_LABELS[cat]}</span>
                    <span style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9, color: color,
                    }}>{count} · {pct}%</span>
                  </div>
                  <div style={{
                    height: 4, background: "rgba(0,0,0,0.06)",
                    borderRadius: 2, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", width: `${pct}%`,
                      background: color, borderRadius: 2,
                      transition: "width 0.6s ease",
                    }}/>
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

// ── NEWS CARD ──
function NewsCard({ item, color, label, category, onRead }) {
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
    if (summary) { setShowSummary(s => !s); return; }
    setSummaryLoading(true);
    setShowSummary(true);
    if (!hasTracked.current) {
      hasTracked.current = true;
      trackRead(category, corroboration);
    }
    try {
      const result = await fetchSummary(item.title, item.description, item.content);
      setSummary(result || "Unable to generate summary for this article.");
    } catch (err) {
      setSummary("Unable to generate summary for this article.");
    }
    setSummaryLoading(false);
  };

  return (
    <div style={{
      height: "100%", width: "100%",
      display: "flex", flexDirection: "column",
      background: "#F5F2ED", boxSizing: "border-box", overflow: "hidden",
    }}>
      {item.urlToImage && (
        <div style={{ width: "100%", height: "190px", flexShrink: 0, overflow: "hidden", background: "#E8E4DD" }}>
          <img
            src={item.urlToImage} alt={item.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={e => { e.target.parentElement.style.display = "none"; }}
          />
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px 14px", overflow: "hidden" }}>

        {/* Category + Corroboration */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }}/>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2.5, color, fontWeight: 500 }}>{label}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
            {corrobLoading ? (
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#D1D5DB", letterSpacing: 1 }}>CHECKING...</span>
            ) : corroboration ? (
              <>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 20 }}>
                  {LEAN_BARS.map(({ key, color: barColor }) => (
                    <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                      <div style={{
                        width: 8,
                        height: corroboration.counts[key] > 0 ? Math.min(Math.max(corroboration.counts[key] * 4, 3), 16) : 2,
                        background: corroboration.counts[key] > 0 ? barColor : "rgba(0,0,0,0.08)",
                        borderRadius: 2,
                      }}/>
                    </div>
                  ))}
                </div>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#9CA3AF", letterSpacing: 0.5 }}>{corroboration.total} SOURCES</span>
              </>
            ) : (
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#D1D5DB" }}>NO DATA</span>
            )}
          </div>
        </div>

        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: item.urlToImage ? 19 : 23, fontWeight: 400, color: "#0A0C10", lineHeight: 1.25, margin: "0 0 8px 0", letterSpacing: "-0.3px" }}>{item.title}</h2>

        <div style={{ width: 32, height: 2, background: color, borderRadius: 1, marginBottom: 10, flexShrink: 0 }}/>

        <div style={{ flex: 1, overflow: "auto", marginBottom: 12 }}>
          {showSummary ? (
            <div style={{ background: "rgba(0,196,168,0.06)", border: "1px solid rgba(0,196,168,0.2)", borderRadius: 10, padding: "10px 12px" }}>
              {summaryLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "16px 0" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00C4A8" }}/>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#00C4A8", letterSpacing: 1 }}>SUMMARIZING...</span>
                </div>
              ) : (
                <ReactMarkdown components={{
                  p: ({ children }) => <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#374151", lineHeight: 1.65, margin: "0 0 8px 0" }}>{children}</p>,
                  strong: ({ children }) => <strong style={{ color: "#0A0C10", fontWeight: 600 }}>{children}</strong>,
                  ul: ({ children }) => <ul style={{ paddingLeft: 16, margin: "6px 0" }}>{children}</ul>,
                  li: ({ children }) => <li style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#374151", lineHeight: 1.6, marginBottom: 4 }}>{children}</li>,
                  h3: ({ children }) => <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1.5, color: "#00C4A8", textTransform: "uppercase", marginBottom: 6, marginTop: 8 }}>{children}</div>,
                }}>{summary}</ReactMarkdown>
              )}
            </div>
          ) : (
            item.description && (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#6B7280", lineHeight: 1.6, margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: item.urlToImage ? 2 : 4, WebkitBoxOrient: "vertical" }}>{item.description}</p>
            )
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, marginBottom: 12, borderTop: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#0A0C10" }}>{item.source?.name}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#9CA3AF" }}>{timeAgo(item.publishedAt)}</span>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={handleSummary} style={{ flex: 1, padding: "11px", background: showSummary ? "rgba(0,196,168,0.1)" : "rgba(0,0,0,0.04)", border: showSummary ? "1px solid rgba(0,196,168,0.3)" : "1px solid rgba(0,0,0,0.08)", borderRadius: 12, fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1, color: showSummary ? "#00C4A8" : "#6B7280", cursor: "pointer", transition: "all 0.2s" }}>
            {showSummary ? "← ORIGINAL" : "⚡ 60s BRIEF"}
          </button>
          <a href={item.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              if (!hasTracked.current) {
                hasTracked.current = true;
                trackRead(category, corroboration);
              }
            }}
            style={{ flex: 2, display: "block", textAlign: "center", padding: "11px", background: "#0A0C10", color: "#F5F2ED", borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, textDecoration: "none", letterSpacing: "0.3px" }}
          >
            Read Full Story →
          </a>
        </div>
      </div>
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
        setArticles(data.articles.filter(a => a.title && a.title !== "[Removed]"));
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
    <div style={{ background: "#E8E4DD", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;600&display=swap" rel="stylesheet"/>

      <div style={{ width: 390, height: 844, background: "#F5F2ED", borderRadius: 44, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 64px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.08)" }}>

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
              <button key={t.label} onClick={() => setActiveTab(t)} style={{ background: "none", border: "none", color: activeTab.label === t.label ? "#0A0C10" : "#9CA3AF", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1.5, padding: "6px 10px 10px", borderBottom: activeTab.label === t.label ? `2px solid ${CATEGORY_COLORS[t.category]}` : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap", fontWeight: activeTab.label === t.label ? 500 : 400, transition: "all 0.2s" }}>
                {t.label.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Screen content */}
        {screen === "profile" ? (
          <ProfilePage />
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
        {screen === "feed" && articles.length > 0 && !loading && (
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