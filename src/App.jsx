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

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diff < 60) return `${diff} min ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

function NewsCard({ item, color, label, isActive }) {
  return (
    <div style={{
      height: "100%",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "24px 20px",
      boxSizing: "border-box",
      background: "#F5F2ED",
    }}>
      {/* Category pill */}
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 20,
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%",
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}/>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          letterSpacing: 3,
          color: color,
          fontWeight: 500,
        }}>{label}</span>
      </div>

      {/* Headline */}
      <h2 style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: 26,
        fontWeight: 400,
        color: "#0A0C10",
        lineHeight: 1.25,
        margin: "0 0 16px 0",
        letterSpacing: "-0.3px",
      }}>{item.title}</h2>

      {/* Rule */}
      <div style={{
        width: 40, height: 2,
        background: color,
        borderRadius: 1,
        marginBottom: 16,
      }}/>

      {/* Description */}
      {item.description && (
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          color: "#6B7280",
          lineHeight: 1.65,
          margin: "0 0 24px 0",
        }}>
          {item.description.length > 140
            ? item.description.slice(0, 140) + "..."
            : item.description}
        </p>
      )}

      {/* Source + time */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: "#0A0C10",
        }}>{item.source?.name}</span>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: "#9CA3AF",
        }}>{timeAgo(item.publishedAt)}</span>
      </div>

      {/* Read button */}
      
        <a href={item.url}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "block",
          textAlign: "center",
          padding: "13px",
          background: "#0A0C10",
          color: "#F5F2ED",
          borderRadius: 12,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          letterSpacing: "0.3px",
        }}
      >
        Read Full Story →
      </a>
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

  // Snap scroll via wheel


  // Touch swipe
const touchStart = useRef(null);
const touchLocked = useRef(false);
const handleTouchStart = (e) => {
  if (touchLocked.current) return;
  touchStart.current = e.touches[0].clientY;
};
const handleTouchEnd = (e) => {
  if (touchStart.current === null || touchLocked.current) return;
  const diff = touchStart.current - e.changedTouches[0].clientY;
  if (Math.abs(diff) > 40) {
    touchLocked.current = true;
    if (diff > 0) setCurrent(c => Math.min(c + 1, articles.length - 1));
    else setCurrent(c => Math.max(c - 1, 0));
    setTimeout(() => { touchLocked.current = false; }, 600);
  }
  touchStart.current = null;
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

      {/* Phone shell */}
      <div style={{
        width: 390,
        height: 844,
        background: "#F5F2ED",
        borderRadius: 44,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 32px 64px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.08)",
      }}>

        {/* Header */}
        <div style={{
          padding: "18px 24px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#F5F2ED",
        }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 24,
            color: "#0A0C10",
            letterSpacing: 5,
            lineHeight: 1,
          }}>
            BRIEF<span style={{ color: "#00C4A8" }}>.</span>
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: "#9CA3AF",
          }}>
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          padding: "10px 16px 0",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          overflowX: "auto",
          scrollbarWidth: "none",
          background: "#F5F2ED",
        }}>
          {TABS.map(t => (
            <button
              key={t.label}
              onClick={() => setActiveTab(t)}
              style={{
                background: "none",
                border: "none",
                color: activeTab.label === t.label ? "#0A0C10" : "#9CA3AF",
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: 1.5,
                padding: "6px 10px 10px",
                borderBottom: activeTab.label === t.label
                  ? `2px solid ${CATEGORY_COLORS[t.category]}`
                  : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontWeight: activeTab.label === t.label ? 500 : 400,
                transition: "all 0.2s",
              }}
            >
              {t.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Feed — snap scroll container */}
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
            }}>
              LOADING...
            </div>
          )}

          {error && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 32, textAlign: "center",
              fontFamily: "'DM Mono', monospace", fontSize: 11,
              color: "#EF4444",
            }}>
              {error}
            </div>
          )}

          {!loading && !error && articles.length > 0 && (
            <div style={{
              position: "absolute",
              top: 0, left: 0, right: 0,
              transform: `translateY(${-current * 100}%)`,
              transition: "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
            }}>
              {articles.map((item, i) => (
                <div key={i} style={{ height: "100%", minHeight: 580 }}>
                  <NewsCard
                    item={item}
                    color={color}
                    label={CATEGORY_LABELS[activeTab.category]}
                    isActive={i === current}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress dots */}
        {articles.length > 0 && !loading && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: 5,
            padding: "8px 0",
            background: "#F5F2ED",
          }}>
            {articles.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  width: i === current ? 20 : 5,
                  height: 5,
                  borderRadius: 3,
                  background: i === current ? color : "rgba(0,0,0,0.15)",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
              />
            ))}
          </div>
        )}

        {/* Bottom nav */}
        <div style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "10px 0 28px",
          borderTop: "1px solid rgba(0,0,0,0.08)",
          background: "#F5F2ED",
        }}>
          {[["⚡","Feed"],["🔍","Search"],["🔖","Saved"],["◎","Profile"]].map(([icon, label]) => (
            <button key={label} style={{
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "pointer",
              color: label === "Feed" ? "#0A0C10" : "#9CA3AF",
            }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                letterSpacing: 0.5,
              }}>{label}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}