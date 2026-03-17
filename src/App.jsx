import { useState, useEffect, useRef } from "react";

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

const BIAS_OPTIONS = [
  { label: "Left",         color: "#3B82F6" },
  { label: "Center-Left",  color: "#60A5FA" },
  { label: "Center",       color: "#9CA3AF" },
  { label: "Center-Right", color: "#F97316" },
  { label: "Right",        color: "#EF4444" },
];

function getBias() {
  return BIAS_OPTIONS[Math.floor(Math.random() * BIAS_OPTIONS.length)];
}

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



function NewsCard({ item, color, label }) {
  const bias = useRef(getBias()).current;
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const [corroboration, setCorroboration] = useState(null);
  const [corrobLoading, setCorrobLoading] = useState(true);

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
      height: "100%",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      background: "#F5F2ED",
      boxSizing: "border-box",
      overflow: "hidden",
    }}>

      {/* Image */}
      {item.urlToImage && (
        <div style={{
          width: "100%",
          height: "190px",
          flexShrink: 0,
          overflow: "hidden",
          background: "#E8E4DD",
        }}>
          <img
            src={item.urlToImage}
            alt={item.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={e => { e.target.parentElement.style.display = "none"; }}
          />
        </div>
      )}

      {/* Content */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "16px 20px 14px",
        overflow: "hidden",
      }}>

        {/* Category + Bias row */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: color, boxShadow: `0 0 6px ${color}`,
            }}/>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9, letterSpacing: 2.5,
              color: color, fontWeight: 500,
            }}>{label}</span>
          </div>

          {/* Bias spectrum */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", position: "relative", width: 140 }}>
              <div style={{
                position: "absolute",
                top: "50%", left: 0, right: 0,
                height: 1, background: "rgba(0,0,0,0.12)",
                transform: "translateY(-50%)", zIndex: 0,
              }}/>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", position: "relative", zIndex: 1 }}>
                {BIAS_OPTIONS.map((b, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div style={{
                      width: b.label === bias.label ? 8 : 5,
                      height: b.label === bias.label ? 8 : 5,
                      borderRadius: "50%",
                      background: b.label === bias.label ? b.color : "rgba(0,0,0,0.15)",
                      boxShadow: b.label === bias.label ? `0 0 5px ${b.color}` : "none",
                      transition: "all 0.2s",
                    }}/>
                    <span style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 6, letterSpacing: 0.3,
                      color: b.label === bias.label ? b.color : "rgba(0,0,0,0.25)",
                      fontWeight: b.label === bias.label ? 600 : 400,
                      whiteSpace: "nowrap",
                    }}>
                      {b.label === "Center-Left" ? "C-Left" :
                       b.label === "Center-Right" ? "C-Right" : b.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: item.urlToImage ? 19 : 23,
          fontWeight: 400,
          color: "#0A0C10",
          lineHeight: 1.25,
          margin: "0 0 8px 0",
          letterSpacing: "-0.3px",
        }}>{item.title}</h2>

        {/* Accent rule */}
        <div style={{
          width: 32, height: 2,
          background: color, borderRadius: 1,
          marginBottom: 10, flexShrink: 0,
        }}/>

        {/* Summary panel — AI or description */}
        <div style={{
          flex: 1,
          overflow: "hidden",
          marginBottom: 12,
        }}>
          {showSummary ? (
            <div style={{
              background: "rgba(0,196,168,0.06)",
              border: "1px solid rgba(0,196,168,0.2)",
              borderRadius: 10,
              padding: "10px 12px",
              height: "auto",
              maxHeight: 150,
              overflow: "auto",
            }}>
              {summaryLoading ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  height: "100%",
                  justifyContent: "center",
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "#00C4A8",
                    animation: "pulse 1s infinite",
                  }}/>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10, color: "#00C4A8", letterSpacing: 1,
                  }}>SUMMARIZING...</span>
                </div>
              ) : (
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: "#374151",
                  lineHeight: 1.65,
                  margin: 0,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 6,
                  WebkitBoxOrient: "vertical",
                }}>{summary}</p>
              )}
            </div>
          ) : (
            item.description && (
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: "#6B7280",
                lineHeight: 1.6,
                margin: 0,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: item.urlToImage ? 2 : 4,
                WebkitBoxOrient: "vertical",
              }}>{item.description}</p>
            )
          )}
        </div>


        {/* Corroboration Score */}
        <div style={{
                  marginBottom: 10,
                  padding: "8px 12px",
                  background: "rgba(0,0,0,0.03)",
                  border: "1px solid rgba(0,0,0,0.07)",
                  borderRadius: 10,
                  flexShrink: 0,
                }}>
                  {corrobLoading ? (
                    <div style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9, color: "#9CA3AF", letterSpacing: 1,
                    }}>CHECKING SOURCES...</div>
                  ) : corroboration ? (
                    <div>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}>
                        <span style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 9, letterSpacing: 1,
                          color: "#6B7280", textTransform: "uppercase",
                        }}>Covered by {corroboration.total} sources</span>
                        <span style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 9, color: "#00C4A8",
                        }}>CORROBORATED</span>
                      </div>
                      <div style={{ display: "flex", gap: 3 }}>
                        {[
                          { key: "Left",         color: "#3B82F6", short: "L" },
                          { key: "Center-Left",  color: "#60A5FA", short: "CL" },
                          { key: "Center",       color: "#9CA3AF", short: "C" },
                          { key: "Center-Right", color: "#F97316", short: "CR" },
                          { key: "Right",        color: "#EF4444", short: "R" },
                        ].map(({ key, color, short }) => (
                          <div key={key} style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 3,
                          }}>
                            <div style={{
                              width: "100%",
                              height: corroboration.counts[key] > 0 ? Math.max(corroboration.counts[key] * 6, 4) : 2,
                              background: corroboration.counts[key] > 0 ? color : "rgba(0,0,0,0.08)",
                              borderRadius: 2,
                              transition: "height 0.3s",
                            }}/>
                            <span style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: 7, color: corroboration.counts[key] > 0 ? color : "#D1D5DB",
                            }}>{short} {corroboration.counts[key]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9, color: "#D1D5DB", letterSpacing: 1,
                    }}>NO CORROBORATION DATA</div>
                  )}
                </div>



        {/* Source + time */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 10,
          marginBottom: 12,
          borderTop: "1px solid rgba(0,0,0,0.07)",
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12, fontWeight: 600, color: "#0A0C10",
          }}>{item.source?.name}</span>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10, color: "#9CA3AF",
          }}>{timeAgo(item.publishedAt)}</span>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleSummary}
            style={{
              flex: 1,
              padding: "11px",
              background: showSummary ? "rgba(0,196,168,0.1)" : "rgba(0,0,0,0.04)",
              border: showSummary ? "1px solid rgba(0,196,168,0.3)" : "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: 1,
              color: showSummary ? "#00C4A8" : "#6B7280",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {showSummary ? "← ORIGINAL" : "⚡ 35s BRIEF"}
          </button>

          
            <a href={item.url}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 2,
              display: "block",
              textAlign: "center",
              padding: "11px",
              background: "#0A0C10",
              color: "#F5F2ED",
              borderRadius: 12,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, fontWeight: 600,
              textDecoration: "none",
              letterSpacing: "0.3px",
            }}
          >
            Read Full Story →
          </a>
        </div>

      </div>
    </div>
  );
}


export default function App() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(0);
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
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [activeTab]);

  const navigate = (dir) => {
    if (touchLocked.current) return;
    touchLocked.current = true;
    setCurrent(c => {
      const next = c + dir;
      return Math.max(0, Math.min(next, articlesRef.current.length - 1));
    });
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
    if (Math.abs(diff) > 50) {
      navigate(diff > 0 ? 1 : -1);
    }
  };

  const color = CATEGORY_COLORS[activeTab.category];

  return (
    <div style={{
      background: "#E8E4DD",
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;600&display=swap" rel="stylesheet"/>

      <div style={{
        width: 390, height: 844,
        background: "#F5F2ED",
        borderRadius: 44, overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: "0 32px 64px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.08)",
      }}>

        {/* Header */}
        <div style={{
          padding: "18px 24px 0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "#F5F2ED", flexShrink: 0,
        }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 24, color: "#0A0C10", letterSpacing: 5, lineHeight: 1,
          }}>
            BRIEF<span style={{ color: "#00C4A8" }}>.</span>
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11, color: "#9CA3AF",
          }}>
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", padding: "10px 16px 0",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          overflowX: "auto", scrollbarWidth: "none",
          background: "#F5F2ED", flexShrink: 0,
        }}>
          {TABS.map(t => (
            <button key={t.label} onClick={() => setActiveTab(t)} style={{
              background: "none", border: "none",
              color: activeTab.label === t.label ? "#0A0C10" : "#9CA3AF",
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: 1.5,
              padding: "6px 10px 10px",
              borderBottom: activeTab.label === t.label
                ? `2px solid ${CATEGORY_COLORS[t.category]}`
                : "2px solid transparent",
              cursor: "pointer", whiteSpace: "nowrap",
              fontWeight: activeTab.label === t.label ? 500 : 400,
              transition: "all 0.2s",
            }}>
              {t.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Feed */}
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
            background: "#F5F2ED",
          }}
        >
          {loading && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'DM Mono', monospace", fontSize: 11,
              color: "#9CA3AF", letterSpacing: 2,
            }}>LOADING...</div>
          )}

          {error && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 32, textAlign: "center",
              fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EF4444",
            }}>{error}</div>
          )}

          {!loading && !error && articles.length > 0 && (
            <div style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
            }}>
              {articles.map((item, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    transform: `translateY(${(i - current) * 100}%)`,
                    transition: "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  <NewsCard
                    item={item}
                    color={color}
                    label={CATEGORY_LABELS[activeTab.category]}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dots */}
        {articles.length > 0 && !loading && (
          <div style={{
            display: "flex", justifyContent: "center",
            gap: 5, padding: "8px 0",
            background: "#F5F2ED", flexShrink: 0,
          }}>
            {articles.map((_, i) => (
              <div key={i} onClick={() => navigate(i - current)} style={{
                width: i === current ? 20 : 5, height: 5,
                borderRadius: 3,
                background: i === current ? color : "rgba(0,0,0,0.15)",
                cursor: "pointer", transition: "all 0.3s",
              }}/>
            ))}
          </div>
        )}

        {/* Bottom nav */}
        <div style={{
          display: "flex", justifyContent: "space-around",
          padding: "10px 0 28px",
          borderTop: "1px solid rgba(0,0,0,0.08)",
          background: "#F5F2ED", flexShrink: 0,
        }}>
          {[["⚡","Feed"],["🔍","Search"],["🔖","Saved"],["◎","Profile"]].map(([icon, label]) => (
            <button key={label} style={{
              background: "none", border: "none",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3, cursor: "pointer",
              color: label === "Feed" ? "#0A0C10" : "#9CA3AF",
            }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 0.5 }}>{label}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}