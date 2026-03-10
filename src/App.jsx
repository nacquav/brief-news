import { useState } from "react";

const placeholder = [
  { id:1, category:"TECHNOLOGY", color:"#00E5C3", headline:"AI systems now process more data in a day than all of pre-2003 history", summary:"New benchmarks show exponential growth in compute, raising excitement and energy concerns.", source:"MIT Technology Review", time:"14 min ago" },
  { id:2, category:"ECONOMY",    color:"#FFB800", headline:"Fed signals two rate cuts possible as inflation cools for fifth consecutive month", summary:"Core PCE came in at 2.1% — closest the Fed has been to its target since 2021. Markets rallied.", source:"Wall Street Journal", time:"41 min ago" },
  { id:3, category:"INFRASTRUCTURE", color:"#FF6B35", headline:"USDOT awards $2.1B in new ITS grants — smart highway corridors to span 14 states", summary:"Funding prioritizes V2X communication, AI-driven traffic management, and connected freight corridors.", source:"Transport Topics", time:"1 hr ago" },
  { id:4, category:"SCIENCE",    color:"#10B981", headline:"CRISPR trial shows 94% reduction in LDL cholesterol after single treatment", summary:"Intellia Therapeutics results suggest a one-time gene edit could permanently replace statins.", source:"Nature Medicine", time:"3 hr ago" },
];

const tabs = ["For You","Tech","Markets","Infrastructure","Science"];

export default function App() {
  const [current, setCurrent] = useState(0);
  const [activeTab, setActiveTab] = useState("For You");
  const item = placeholder[current];

  return (
    <div style={{ background:"#0A0C10", minHeight:"100vh", display:"flex", justifyContent:"center", alignItems:"center", fontFamily:"sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;600&display=swap" rel="stylesheet"/>

      <div style={{ width:390, height:844, background:"#0B0D14", borderRadius:44, overflow:"hidden", display:"flex", flexDirection:"column", border:"1px solid rgba(255,255,255,0.08)", boxShadow:"0 40px 80px rgba(0,0,0,0.8)" }}>

        {/* Header */}
        <div style={{ padding:"16px 24px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"white", letterSpacing:4 }}>
            BRIEF<span style={{ color:"#00E5C3" }}>.</span>
          </div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"rgba(255,255,255,0.3)" }}>9:41</div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", padding:"8px 12px 0", borderBottom:"1px solid rgba(255,255,255,0.06)", overflowX:"auto" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ background:"none", border:"none", color: activeTab===t ? "#00E5C3" : "rgba(255,255,255,0.3)", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1, padding:"6px 10px 10px", borderBottom: activeTab===t ? "2px solid #00E5C3" : "2px solid transparent", cursor:"pointer", whiteSpace:"nowrap" }}>{t}</button>
          ))}
        </div>

        {/* Card */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"flex-end", padding:16 }}>
          <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:20, position:"relative" }}>
            <div style={{ height:2, background:`linear-gradient(90deg, ${item.color}, transparent)`, borderRadius:1, marginBottom:16 }}/>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:item.color, letterSpacing:2, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:item.color, display:"inline-block" }}/>
              {item.category}
            </div>
            <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, color:"#F9FAFB", lineHeight:1.3, marginBottom:12 }}>{item.headline}</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"rgba(255,255,255,0.5)", lineHeight:1.6, marginBottom:16 }}>{item.summary}</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:12, marginBottom:16 }}>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"rgba(255,255,255,0.6)", fontWeight:600 }}>{item.source}</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"rgba(255,255,255,0.3)" }}>{item.time}</span>
            </div>
            <button style={{ width:"100%", background:`linear-gradient(135deg, ${item.color}22, ${item.color}11)`, border:`1px solid ${item.color}44`, borderRadius:10, padding:"10px", color:item.color, fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              Read Full Story →
            </button>
          </div>

          {/* Nav dots */}
          <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:16 }}>
            {placeholder.map((_,i) => (
              <div key={i} onClick={() => setCurrent(i)} style={{ width: i===current ? 20 : 6, height:6, borderRadius:3, background: i===current ? "#00E5C3" : "rgba(255,255,255,0.15)", cursor:"pointer", transition:"all 0.3s" }}/>
            ))}
          </div>
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