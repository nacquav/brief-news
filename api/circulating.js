import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const cache = { data: null, timestamp: 0 };
const CACHE_TTL = 20 * 60 * 1000;

const VIRAL_FEEDS = [
  { url: "https://www.buzzfeed.com/index.xml",                    source: "BuzzFeed" },
  { url: "https://mashable.com/feeds/rss/all",                    source: "Mashable" },
  { url: "https://knowyourmeme.com/memes/trending.rss",           source: "Know Your Meme" },
  { url: "https://www.reddit.com/r/OutOfTheLoop/hot.rss",         source: "r/OutOfTheLoop" },
  { url: "https://www.reddit.com/r/TikTokCringe/hot.rss",         source: "r/TikTokCringe" },
  { url: "https://www.reddit.com/r/popular/hot.rss",              source: "r/popular" },
  { url: "https://www.reddit.com/r/worldnews/hot.rss",            source: "r/worldnews" },
  { url: "https://www.reddit.com/r/entertainment/hot.rss",        source: "r/entertainment" },
];

async function fetchGoogleTrends() {
  const urls = [
    "https://trends.google.com/trending/rss?geo=US",
    "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US&hl=en-US",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
        }
      });
      if (!res.ok) continue;
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
          const traffic = trafficMatch ? parseInt(trafficMatch[1].replace(/[^0-9]/g, "")) || 50000 : 50000;
          if (term) items.push({ term, traffic, crossSources: ["Google Trends"] });
        }
      }
      if (items.length > 0) return items.slice(0, 8);
    } catch { continue; }
  }
  throw new Error("Google Trends unavailable");
}

async function fetchViralContent() {
  const results = await Promise.allSettled(
    VIRAL_FEEDS.map(async ({ url, source }) => {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
        }
      });
      if (!res.ok) return [];
      const xml = await res.text();
      const items = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];
        const titleMatch = block.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>|<title>([^<]+)<\/title>/i);
        const title = titleMatch ? (titleMatch[1] || titleMatch[2] || "").trim() : "";
        if (title && title.length > 10 && title.length < 120) {
          items.push({
            term: title,
            traffic: Math.random() * 50000 + 10000,
            crossSources: [source],
          });
        }
      }
      return items.slice(0, 3);
    })
  );

  const all = results
    .filter(r => r.status === "fulfilled")
    .flatMap(r => r.value);

  if (all.length === 0) throw new Error("No viral content found");

  // Shuffle for variety across sources
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all.slice(0, 8);
}

async function generateBrief(term) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 150,
    messages: [{
      role: "user",
      content: `You are a cultural analyst for BRIEF. In one sentence of 70-90 characters max, explain what "${term}" is and why it's circulating right now. Direct and conversational — like explaining to a friend.

Then on a new line, one word only. Be decisive:
- Substance = genuine news, political event, sports result, health story, or cultural milestone that matters tomorrow
- Mixed = real story but online reaction is exaggerated
- Noise = meme, gossip, viral video, entertainment fluff, fades in 24h

Most things are Substance or Noise. Only use Mixed when it truly falls between both.`,
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
  const mins = Math.floor(Math.random() * 180) + 10;
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return res.status(200).json({ trends: cache.data, cached: true });
  }

  let terms = [];
  let dataSource = "viral";

  // Try Google Trends first
  try {
    terms = await fetchGoogleTrends();
    dataSource = "google";
    console.log("Using Google Trends");
  } catch (googleErr) {
    console.warn("Google Trends failed:", googleErr.message);
    // Fall back to viral RSS feeds
    try {
      terms = await fetchViralContent();
      dataSource = "viral";
      console.log("Using viral RSS feeds:", terms.length, "items");
    } catch (viralErr) {
      console.error("All sources failed:", viralErr.message);
      return res.status(200).json({ trends: [], cached: false });
    }
  }

  const maxTraffic = Math.max(...terms.map(t => t.traffic), 1);

  const trends = (await Promise.all(
    terms.slice(0, 6).map(async ({ term, traffic, crossSources }, i) => {
      try {
        const { brief, noiseRating } = await generateBrief(term);
        return {
          id: i + 1,
          term,
          spike: Math.max(Math.round((traffic / maxTraffic) * 100), 20),
          brief,
          noiseRating,
          timeAgo: randomTimeAgo(),
          crossSources,
        };
      } catch { return null; }
    })
  )).filter(Boolean);

  cache.data = trends;
  cache.timestamp = Date.now();
  return res.status(200).json({ trends, cached: false, source: dataSource });
}