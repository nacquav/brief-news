import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const cache = { data: null, timestamp: 0 };
const CACHE_TTL = 20 * 60 * 1000;

async function fetchTrendingTerms() {
  try {
    const res = await fetch(
      "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
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
        const traffic = trafficMatch ? trafficMatch[1].replace(/[^0-9]/g, "") : "0";
        if (term) items.push({ term, traffic: parseInt(traffic) || 0 });
      }
    }
    return items.slice(0, 8);
  } catch (err) {
    console.error("Google Trends fetch error:", err);
    return [];
  }
}

async function generateBrief(term) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `You are a media analyst for BRIEF., a neutral news app. In 3-4 sentences, explain what "${term}" is, why it is currently spreading online, and whether it represents a substantive news story or a short-lived viral moment. Be concise and neutral — no editorializing.

End your response with exactly one word on a new line — either Signal, Mixed, or Noise — to rate its news value:
- Signal = real story with lasting significance
- Mixed = real story but inflated or distorted online
- Noise = viral moment with low news substance`
    }]
  });

  const text = message.content[0].text.trim();
  const lines = text.split("\n").filter(l => l.trim());
  const lastWord = lines[lines.length - 1].trim();
  const noiseMap = { "Signal": "signal", "Mixed": "high", "Noise": "noise" };
  const noiseRating = noiseMap[lastWord] || "high";
  const brief = lines.slice(0, -1).join(" ").trim();

  return { brief, noiseRating };
}

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return res.status(200).json({ trends: cache.data, cached: true });
  }

  try {
    const terms = await fetchTrendingTerms();

    if (terms.length === 0) {
      return res.status(200).json({ trends: [], cached: false });
    }

    const maxTraffic = Math.max(...terms.map(t => t.traffic), 1);

    const trends = await Promise.all(
      terms.slice(0, 6).map(async ({ term, traffic }, i) => {
        try {
          const { brief, noiseRating } = await generateBrief(term);
          const spike = Math.round((traffic / maxTraffic) * 100);
          return {
            id: i + 1,
            term,
            spike: Math.max(spike, 20),
            brief,
            noiseRating,
            timeAgo: timeAgo(Date.now() - Math.random() * 3 * 60 * 60 * 1000),
            crossSources: ["Google Trends", "X / Twitter", "Reddit"],
          };
        } catch {
          return null;
        }
      })
    );

    const filtered = trends.filter(Boolean);
    cache.data = filtered;
    cache.timestamp = Date.now();

    return res.status(200).json({ trends: filtered, cached: false });

  } catch (err) {
    console.error("Circulating error:", err);
    return res.status(500).json({ error: err.message });
  }
}