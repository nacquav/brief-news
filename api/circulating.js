import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const cache = { data: null, timestamp: 0 };
const CACHE_TTL = 20 * 60 * 1000;

async function fetchViralContent() {
    const VIRAL_FEEDS = [
      { url: "https://www.buzzfeed.com/index.xml", source: "BuzzFeed" },
      { url: "https://mashable.com/feeds/rss/all", source: "Mashable" },
      { url: "https://knowyourmeme.com/memes/trending.rss", source: "Know Your Meme" },
      { url: "https://www.reddit.com/r/OutOfTheLoop/hot.rss", source: "Reddit" },
      { url: "https://www.reddit.com/r/hatemylife/hot.rss", source: "Reddit" },
      { url: "https://www.reddit.com/r/TikTokCringe/hot.rss", source: "Reddit" },
      { url: "https://www.reddit.com/r/popular/hot.rss", source: "Reddit Popular" },
    ];
  
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
          if (title && title.length > 10) {
            items.push({ term: title.slice(0, 80), traffic: Math.random() * 50000 + 10000, crossSources: [source, "X / Twitter", "TikTok"] });
          }
        }
        return items.slice(0, 4);
      })
    );
  
    const all = results
      .filter(r => r.status === "fulfilled")
      .flatMap(r => r.value);
  
    if (all.length === 0) throw new Error("No viral content found");
  
    // Shuffle for variety
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
  
    return all.slice(0, 8);
  }

async function fetchGoogleTrends() {
  // Try the new Google Trends URL format
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
          if (term) items.push({ term, traffic, crossSources: ["Google Trends", "X / Twitter", "Web"] });
        }
      }
      if (items.length > 0) return items.slice(0, 8);
    } catch { continue; }
  }
  throw new Error("All Google Trends URLs failed");
}

async function generateBrief(term) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `You are a cultural analyst for BRIEF., a news app. In one sentence of 70-90 characters, explain what "${term}" is and why it's going viral right now. Be direct, neutral, and conversational — write like you're explaining it to a friend.

Then on a new line, write exactly one word:
- Substance = cultural moment with real significance, news about personnel and health, world topics
- Mixed = real story but blown out of proportion
- Noise = pure viral fluff, fades in 24 hours`,
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
  let dataSource = "hackernews";

  // Try Google Trends first
  try {
    terms = await fetchGoogleTrends();
    dataSource = "google";
    console.log("Using Google Trends");
  } catch (googleErr) {
    console.warn("Google Trends failed:", googleErr.message);
    // Fall back to HackerNews — always works, no auth
    try {
      terms = await fetchViralContentfetchHackerNewsTrending();
      dataSource = "hackernews";
      console.log("Using HackerNews trending");
    } catch (hnErr) {
      console.error("All sources failed:", hnErr.message);
      return res.status(200).json({ trends: [], cached: false });
    }
  }

  const maxTraffic = Math.max(...terms.map(t => t.traffic), 1);

  const trends = (await Promise.all(
    terms.slice(0, 6).map(async ({ term, traffic, crossSources, score, comments }, i) => {
      try {
        const { brief, noiseRating } = await generateBrief(term);
        const spike = Math.max(Math.round((traffic / maxTraffic) * 100), 20);
        return {
          id: i + 1,
          term,
          spike,
          brief,
          noiseRating,
          timeAgo: randomTimeAgo(),
          crossSources: crossSources || ["Hacker News", "X / Twitter", "Web"],
          score: score || null,
          comments: comments || null,
        };
      } catch { return null; }
    })
  )).filter(Boolean);

  cache.data = trends;
  cache.timestamp = Date.now();
  return res.status(200).json({ trends, cached: false, source: dataSource });
}