import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchArticleContent(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BriefApp/1.0)" }
    });
    const html = await res.text();

    // Strip HTML tags and extract readable text
    const stripped = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Extract the most content-rich section — look for article body
    const bodyMatch = stripped.match(/(.{2000,})/);
    return bodyMatch ? bodyMatch[0].slice(0, 4000) : stripped.slice(0, 4000);
  } catch (err) {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { title, description, content, url } = req.query;

  // Try to fetch full article content from URL first
  let fullContent = null;
  if (url) {
    fullContent = await fetchArticleContent(url);
  }

  const articleText = fullContent
    ? `${title}\n\n${fullContent}`
    : [title, description, content].filter(Boolean).join(" ");

  if (!articleText || articleText.length < 20) {
    return res.status(400).json({ error: "Not enough content." });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `You are the voice of BRIEF — a concise, neutral news app for people who want facts without the noise.

Summarize this article clearly and directly. Write like a well-informed colleague giving you a quick verbal briefing — professional but human, never stiff.

Rules:
- Each distinct point gets its own line with a blank line between
- Maximum 2 sentences per point
- Plain language — no jargon, no passive voice, no filler words
- Strictly neutral tone — report what happened, not what it means for people
- No editorializing, no emotional language, no speculative impact statements
- Never start with the headline or "This article"
- Bold the single most important fact in each point using **bold**
- Final line: one neutral sentence on broader context — must add new information, not restate what was already said. Format the final line in bold.
- Avoid repeating the same proper nouns or facts across points
- If the article content is too short, incomplete, or unclear to summarize properly, respond with exactly: "Summary unavailable — article content is too limited."

Target: 60 seconds to read aloud. Under 100 words.

Article:
${articleText.slice(0, 4000)}

Summary:`,
      }],
    });

    const summary = message.content[0]?.text?.trim();
    if (!summary) return res.status(500).json({ error: "No summary returned." });
    return res.status(200).json({ summary });

  } catch (err) {
    console.error("Summary error:", err);
    return res.status(500).json({ error: err.message });
  }
}