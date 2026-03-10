import { useState, useEffect } from "react";

const TABS = [
  { label: "For You",       category: "general" },
  { label: "Tech",          category: "technology" },
  { label: "Markets",       category: "business" },
  { label: "Science",       category: "science" },
];

const CATEGORY_COLORS = {
  general:    "#00E5C3",
  technology: "#00E5C3",
  business:   "#FFB800",
  science:    "#10B981",
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diff < 60) return `${diff} min ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;
  return `${Math.floor(diff / 1440)} days ago`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [articles, setArticles] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setCurrent(0);
    const key = import.meta.env.VITE_NEWS_KEY;
    fetch(`https://newsapi.org/v2/top-headlines?country=us&category=${activeTab.category}&pageSize=10&apiKey=${key}`)
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

  const item = articles[current];
  const color = CATEGORY_COLORS[activeTab.category];

  return (
    <div style={{ background:"#0A0C10", minHeight:"100vh", display:"flex", justifyContent:"center", alignItems:"center", fontFamily:"sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;600&display=swap" rel="stylesheet"/>

      <div style={{ width:390, height:844, background:"#0B0D14", borderRadius:44, overflow:"hidden", display:"flex", flexDirection:"column", border:"1px solid rgba(255,255,255,0.08)", boxShadow:"0 40px 80px rgba(0,0,0,0.8)" }}>

        {/* Header */}
        <div style={{ padding:"16px 24px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"white", letterSpacing:4 }}>
            BRIEF<span style={{ color:"#00E5C3" }}>.</span>
          </div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"rgba(255,255,255,0.3)" }}>
            {new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", padding:"8px 12px 0", borderBottom:"1px solid rgba(255,255,255,0.06)", overflowX:"auto" }}>
          {TABS.map(t => (
            <button key={t.label} onClick={() => setActiveTab(t)} style={{ background:"none", border:"none", color: activeTab.label===t.label ? "#00E5C3" : "rgba(255,255,255,0.3)", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1, padding:"6px 10px 10px", borderBottom: activeTab.label===t.label ? "2px solid #00E5C3" : "2px solid transparent", cursor:"pointer", whiteSpace:"nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"flex-end", padding:16 }}>

          {loading && (
            <div style={{ textAlign:"center", color:"rgba(255,255,255,0.3)", fontFamily:"'DM Mono',monospace", fontSize:12, marginBottom:40 }}>
              Loading...
            </div>
          )}

          {error && (
            <div style={{ textAlign:"center", color:"#FF6B6B", fontFamily:"'DM Mono',monospace", fontSize:11, marginBottom:40, padding:"0 20px" }}>
              {error}
            </div>
          )}

          {!loading && !error && item && (
            <>
              <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:20, position:"relative" }}>
                <div style={{ height:2, background:`linear-gradient(90deg, ${color}, transparent)`, borderRadius:1, marginBottom:16 }}/>

                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:color, letterSpacing:2, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:color, display:"inline-block" }}/>
                  {activeTab.label.toUpperCase()}
                </div>

                <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:19, color:"#F9FAFB", lineHeight:1.35, marginBottom:12 }}>
                  {item.title}
                </div>

                {item.description && (
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"rgba(255,255,255,0.5)", lineHeight:1.6, marginBottom:16 }}>
                    {item.description.length > 120 ? item.description.slice(0, 120) + "..." : item.description}
                  </div>
                )}

                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:12, marginBottom:16 }}>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"rgba(255,255,255,0.6)", fontWeight:600 }}>
                    {item.source?.name || "Unknown"}
                  </span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"rgba(255,255,255,0.3)" }}>
                    {timeAgo(item.publishedAt)}
                  </span>
                </div>

                <a href={item.url} target="_blank" rel="noreferrer" style={{ display:"block", width:"100%", background:`linear-gradient(135deg, ${color}22, ${color}11)`, border:`1px solid ${color}44`, borderRadius:10, padding:"10px", color:color, fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, cursor:"pointer", textAlign:"center", textDecoration:"none" }}>
                  Read Full Story →
                </a>
              </div>

              {/* Dots */}
              <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:16 }}>
                {articles.map((_,i) => (
                  <div key={i} onClick={() => setCurrent(i)} style={{ width: i===current ? 20 : 6, height:6, borderRadius:3, background: i===current ? "#00E5C3" : "rgba(255,255,255,0.15)", cursor:"pointer", transition:"all 0.3s" }}/>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bottom nav */}
        <div style={{ display:"flex", justifyContent:"space-around", padding:"10px 0 24px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          {[["⚡","Feed"],["🔍","Search"],["🔖","Saved"],["◎","Profile"]].map(([icon,label]) => (
            <button key={label} style={{ background:"none", border:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer", color: label==="Feed" ? "#00E5C3" : "rgba(255,255,255,0.3)" }}>
              <span style={{ fontSize:18 }}>{icon}</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:0.5 }}>{label}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}