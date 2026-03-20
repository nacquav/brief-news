const GUARDIAN_KEY = process.env.GUARDIAN_API_KEY;
const NEWS_KEY = process.env.VITE_NEWS_KEY;

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

// In-memory cache
const cache = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function fetchFromGuardian(category) {
  const section = GUARDIAN_SECTIONS[category] || "news";
  const url = `https://content.guardianapis.com/search?section=${section}&show-fields=thumbnail,trailText,headline&page-size=10&api-key=${GUARDIAN_KEY}`;
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
  }));
}

async function fetchFromNewsAPI(category) {
  const cat = NEWSAPI_CATEGORIES[category] || "general";
  const url = `https://newsapi.org/v2/top-headlines?country=us&category=${cat}&pageSize=10&apiKey=${NEWS_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "ok") throw new Error(data.message || "NewsAPI error");
  return data.articles.filter(a => a.title && a.title !== "[Removed]");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { category } = req.query;

  // Check cache
  const cacheKey = `news_${category}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`Cache hit: ${cacheKey}`);
    return res.status(200).json({ status: "ok", articles: cached.articles, source: cached.source, cached: true });
  }

  try {
    const articles = await fetchFromGuardian(category);
    cache[cacheKey] = { articles, timestamp: Date.now(), source: "guardian" };
    return res.status(200).json({ status: "ok", articles, source: "guardian", cached: false });
  } catch (guardianErr) {
    console.warn("Guardian failed, falling back to NewsAPI:", guardianErr.message);
    try {
      const articles = await fetchFromNewsAPI(category);
      cache[cacheKey] = { articles, timestamp: Date.now(), source: "newsapi" };
      return res.status(200).json({ status: "ok", articles, source: "newsapi", cached: false });
    } catch (newsErr) {
      return res.status(500).json({ status: "error", message: "Both news sources failed." });
    }
  }
}