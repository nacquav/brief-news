import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const cache = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { title, source } = req.query;

  if (!title) return res.status(400).json({ error: "No title provided" });

  const cacheKey = `bias_${title.slice(0, 50)}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.status(200).json(cached.data);
  }

  try {
    // Step 1 — search for corroborating sources
    const keywords = title.split(" ").slice(0, 6).join(" ");
    const newsRes = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(keywords)}&pageSize=15&sortBy=relevancy&apiKey=${process.env.VITE_NEWS_KEY}`
    );
    const newsData = await newsRes.json();

    const sources = newsData.articles
      ? [...new Set(newsData.articles.filter(a => a.source?.name).map(a => a.source.name))].slice(0, 10)
      : [];

    // Step 2 — ask Claude to classify bias
    const prompt = sources.length > 0
      ? `You are a media bias analyst. Given this news article and the sources covering it, return a JSON object with two things:
1. "lean": the overall political lean of this story's coverage. Must be exactly one of: "Left", "Center-Left", "Center", "Center-Right", "Right"
2. "counts": how many of the provided sources fall into each lean category
3. "total": total number of sources

Article title: "${title}"
Primary source: "${source || "Unknown"}"
Other sources covering this story: ${sources.join(", ")}

Respond ONLY with valid JSON, no explanation:
{"lean": "Center", "counts": {"Left": 0, "Center-Left": 2, "Center": 3, "Center-Right": 1, "Right": 0}, "total": 6}`
      : `You are a media bias analyst. Classify the political lean of this news article based on its title and source.

Article title: "${title}"
Source: "${source || "Unknown"}"

Respond ONLY with valid JSON:
{"lean": "Center", "counts": {"Left": 0, "Center-Left": 0, "Center": 1, "Center-Right": 0, "Right": 0}, "total": 1}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });

    let result;
    try {
      result = JSON.parse(message.content[0].text.trim());
    } catch {
      result = { lean: "Center", counts: { Left: 0, "Center-Left": 0, Center: 1, "Center-Right": 0, Right: 0 }, total: sources.length || 1 };
    }

    const data = { score: { ...result, sources } };
    cache[cacheKey] = { data, timestamp: Date.now() };
    return res.status(200).json(data);

  } catch (err) {
    console.error("Bias error:", err);
    return res.status(500).json({ error: err.message });
  }
}