import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { title } = req.query;

  if (!title) {
    return res.status(400).json({ error: "No title provided" });
  }

  try {
    // Search for the same story across sources
    const keywords = title.split(" ").slice(0, 6).join(" ");
    const newsRes = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(keywords)}&pageSize=15&sortBy=relevancy&apiKey=${process.env.VITE_NEWS_KEY}`
    );
    const newsData = await newsRes.json();

    if (!newsData.articles || newsData.articles.length === 0) {
      return res.status(200).json({ score: null });
    }

    // Get unique sources
    const sources = [...new Set(
      newsData.articles
        .filter(a => a.source?.name)
        .map(a => a.source.name)
    )].slice(0, 10);

    if (sources.length === 0) {
      return res.status(200).json({ score: null });
    }

    // Ask Claude to classify each source's lean
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Classify the political lean of each of these news sources as one of: Left, Center-Left, Center, Center-Right, Right.

Sources: ${sources.join(", ")}

Respond ONLY with a JSON object like this, no explanation:
{"Source Name": "Left", "Other Source": "Center", ...}`
      }]
    });

    let leanMap = {};
    try {
      const text = message.content[0].text.trim();
      leanMap = JSON.parse(text);
    } catch {
      return res.status(200).json({ score: null });
    }

    // Count by lean
    const counts = { Left: 0, "Center-Left": 0, Center: 0, "Center-Right": 0, Right: 0 };
    Object.values(leanMap).forEach(lean => {
      if (counts[lean] !== undefined) counts[lean]++;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    res.status(200).json({
      score: {
        total: sources.length,
        counts,
        sources,
        total_classified: total,
      }
    });

  } catch (err) {
    console.error("Corroborate error:", err);
    res.status(500).json({ error: err.message });
  }
}