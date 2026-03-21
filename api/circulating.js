import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const cache = { data: null, timestamp: 0 };
const CACHE_TTL = 20 * 60 * 1000;

async function fetchGoogleTrends() {
  const res = await fetch(
    "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US",
    { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } }
  );
  if (!res.ok) throw new Error(`Google Trends status ${res.status}`);
  const xml = await res.text();
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const titleMatch = item.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>|<title>([^<]+)<\/title>/);
    const trafficMatch = item.match(/<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/);
    if (titleMatch) {
      const term = (titleMatch[1] || titleMatch[2] || "").trim();
      const traffic = trafficMatch ? parseInt(trafficMatch[1].replace(/[^0-9]/g, "")) || 0 : 0;
      if (term) items.push({ term, traffic, source: "Google Trends" });
    }
  }
  if (items.length === 0) throw new Error("No trends parsed");
  return items.slice(0, 8);
}



async function fetchRedditTrending() {
    const res = await fetch(
      "https://www.reddit.com/r/all/rising.json?limit=15",
      { headers: { "User-Agent": "BriefApp/1.0 (by /u/brief_app)" } }
    );
    if (!res.ok) throw new Error(`Reddit status ${res.status}`);
    const data = await res.json();
    return data.data.children
      .map(p => p.data)
      .filter(p => p.title && p.ups > 50 && !p.over_18)
      .map(p => ({
        term: p.title.length > 80 ? p.title.slice(0, 77) + "..." : p.title,
        traffic: p.ups + p.num_comments * 10,
        source: `r/${p.subreddit}`,
        crossSources: ["Reddit", `r/${p.subreddit}`, "X / Twitter"],
      }))
      .slice(0, 8);
  }

async function generateBrief(term) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `You are a media analyst for BRIEF., a neutral news app. In 3-4 sentences, explain what "${term}" is, why it is currently spreading online, and whether it represents a substantive news story or a short-lived viral moment. Be concise and neutral.

End your response with exactly one word on a new line:
- Substance = real story with lasting significance
- Mixed = real story but inflated or distorted online
- Noise = viral moment with low news substance

Write only the brief and the final word rating.`,
    }],
  });

  const text = message.content[0].text.trim();
  const lines = text.split("\n").filter(l => l.trim());
  const lastWord = lines[lines.length - 1].trim();
  const noiseMap = { "Substance": "signal", "Mixed": "high", "Noise": "noise" };
  const noiseRating = noiseMap[lastWord] || "high";
  const brief = lines.slice(0, -1).join(" ").trim();
  return { brief, noiseRating };
}

function randomTimeAgo() {
  const mins = Math.floor(Math.random() * 180);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return res.status(200).json({ trends: cache.data, cached: true });
  }

  let terms = [];
  let dataSource = "google";

  // Try Google Trends first
  try {
    terms = await fetchGoogleTrends();
    dataSource = "google";
    console.log("Using Google Trends");
  } catch (googleErr) {
    console.warn("Google Trends blocked, trying Reddit:", googleErr.message);
    // Fall back to Reddit
    try {
      terms = await fetchRedditTrending();
      dataSource = "reddit";
      console.log("Using Reddit trending");
    } catch (redditErr) {
      console.error("Both sources failed:", redditErr.message);
      return res.status(200).json({ trends: [], cached: false });
    }
  }

  const maxTraffic = Math.max(...terms.map(t => t.traffic), 1);

  const trends = (await Promise.all(
    terms.slice(0, 6).map(async ({ term, traffic, source, crossSources }, i) => {
      try {
        const { brief, noiseRating } = await generateBrief(term);
        return {
          id: i + 1,
          term,
          spike: Math.max(Math.round((traffic / maxTraffic) * 100), 20),
          brief,
          noiseRating,
          timeAgo: randomTimeAgo(),
          crossSources: crossSources || [
            dataSource === "google" ? "Google Trends" : "Reddit",
            "X / Twitter",
            source || "Web",
          ],
        };
      } catch { return null; }
    })
  )).filter(Boolean);

  cache.data = trends;
  cache.timestamp = Date.now();
  return res.status(200).json({ trends, cached: false });
}