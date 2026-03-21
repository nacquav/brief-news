const GUARDIAN_KEY = process.env.GUARDIAN_API_KEY;
const NEWS_KEY = process.env.VITE_NEWS_KEY;

const cache = {};
const CACHE_TTL = 15 * 60 * 1000;

const GUARDIAN_SECTIONS = {
  general:    "news",
  technology: "technology",
  business:   "business",
  science:    "science",
  health:     "society",
};

const NEWSAPI_CATEGORIES = {
  general:    "general",
  technology: "technology",
  business:   "business",
  science:    "science",
  health:     "health",
};

const RSS_FEEDS = {
  general: [
    { url: "https://feeds.bbci.co.uk/news/rss.xml",               source: "BBC News" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", source: "New York Times" },
    { url: "https://feeds.npr.org/1001/rss.xml",                  source: "NPR" },
  ],
  technology: [
    { url: "https://feeds.bbci.co.uk/news/technology/rss.xml",    source: "BBC Technology" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", source: "New York Times" },
    { url: "https://feeds.npr.org/1019/rss.xml",                  source: "NPR Technology" },
  ],
  business: [
    { url: "https://feeds.bbci.co.uk/news/business/rss.xml",      source: "BBC Business" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", source: "New York Times" },
    { url: "https://feeds.npr.org/1006/rss.xml",                  source: "NPR Business" },
  ],
  science: [
    { url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", source: "BBC Science" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml", source: "New York Times" },
    { url: "https://feeds.npr.org/1007/rss.xml",                  source: "NPR Science" },
  ],
  health: [
    { url: "https://feeds.bbci.co.uk/news/health/rss.xml",        source: "BBC Health" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/Health.xml", source: "New York Times" },
    { url: "https://feeds.npr.org/1128/rss.xml",                  source: "NPR Health" },
  ],
};

function parseRSS(xml, sourceName) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const get = (tag) => {
      const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i'));
      return m ? (m[1] || m[2] || "").trim() : "";
    };
    const mediaMatch = item.match(/<media:content[^>]+url="([^"]+)"/i) ||
                       item.match(/<media:thumbnail[^>]+url="([^"]+)"/i) ||
                       item.match(/<enclosure[^>]+url="([^"]+)"/i);
    const title = get("title");
    const description = get("description").replace(/<[^>]+>/g, "").trim();
    const link = get("link") || item.match(/<link>([^<]+)<\/link>/i)?.[1] || "";
    const pubDate = get("pubDate");
    const image = mediaMatch ? mediaMatch[1] : null;
    if (title && link) {
      items.push({
        title,
        description,
        url: link.trim(),
        urlToImage: image,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        source: { name: sourceName },
        content: description,
      });
    }
  }
  return items;
}

async function fetchRSS(category) {
  const feeds = RSS_FEEDS[category] || RSS_FEEDS.general;
  const results = await Promise.allSettled(
    feeds.map(async ({ url, source }) => {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const xml = await res.text();
      return parseRSS(xml, source);
    })
  );
  const articles = results
    .filter(r => r.status === "fulfilled")
    .flatMap(r => r.value)
    .filter(a => a.title && a.urlToImage)
    .slice(0, 15);
  return articles;
}

async function fetchFromGuardian(category) {
  const section = GUARDIAN_SECTIONS[category] || "news";
  const url = `https://content.guardianapis.com/search?section=${section}&show-fields=thumbnail,trailText,headline&page-size=8&api-key=${GUARDIAN_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.response?.status !== "ok") throw new Error("Guardian API error");
  return data.response.results.map(a => ({
    title: a.fields?.headline || a.webTitle,
    description: a.fields?.trailText || "",
    urlToImage: a.fields?.thumbnail || null,
    url: a.webUrl,
    publishedAt: a.webPublicationDate,
    source: { name: "The Guardian" },
    content: a.fields?.trailText || "",
  })).filter(a => a.urlToImage);
}

async function fetchFromNewsAPI(category) {
  const cat = NEWSAPI_CATEGORIES[category] || "general";
  const url = `https://newsapi.org/v2/top-headlines?country=us&category=${cat}&pageSize=10&apiKey=${NEWS_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "ok") throw new Error(data.message || "NewsAPI error");
  return data.articles.filter(a => a.title && a.title !== "[Removed]" && a.urlToImage);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function dedupe(articles) {
  const seen = new Set();
  return articles.filter(a => {
    const key = a.title.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { category } = req.query;

  const cacheKey = `news_${category}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.status(200).json({ status: "ok", articles: cached.articles, cached: true });
  }

  try {
    const [guardianArticles, rssArticles] = await Promise.allSettled([
      fetchFromGuardian(category),
      fetchRSS(category),
    ]);

    const guardian = guardianArticles.status === "fulfilled" ? guardianArticles.value : [];
    const rss = rssArticles.status === "fulfilled" ? rssArticles.value : [];

    // Mix sources — Guardian first, then RSS, shuffle, dedupe
    const mixed = dedupe(shuffle([...guardian, ...rss])).slice(0, 12);

    if (mixed.length === 0) {
      // Final fallback to NewsAPI
      const newsapi = await fetchFromNewsAPI(category);
      cache[cacheKey] = { articles: newsapi, timestamp: Date.now() };
      return res.status(200).json({ status: "ok", articles: newsapi, cached: false });
    }

    cache[cacheKey] = { articles: mixed, timestamp: Date.now() };
    return res.status(200).json({ status: "ok", articles: mixed, cached: false });

  } catch (err) {
    console.error("News fetch error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
}