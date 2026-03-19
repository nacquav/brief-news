import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { title, description, content } = req.query;

  const articleText = [title, description, content]
    .filter(Boolean)
    .join(" ")
    .slice(0, 2000);

  if (!articleText || articleText.length < 20) {
    return res.status(400).json({ error: "Not enough article content to summarize." });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: 
          `You are the voice of BRIEF — a concise, neutral news app for people who want facts without the noise.

          Summarize this article clearly and directly. Write like a well-informed colleague giving you a quick verbal briefing — professional but human, never stiff.

          Rules:
          - Each distinct point gets its own line with a blank line between
          - Maximum 2 sentences per point
          - Plain language — no jargon, no passive voice, no filler words
          - Strictly neutral tone — report what happened, not what it means for people
          - No editorializing, no emotional language, no speculative impact statements
          - Never start with the headline or "This article"
          - Final line: one neutral sentence on the broader context or significance

          Target: 60 seconds to read aloud. Around 100 words.

          Article: ${articleText}

          Summary:`,
        },
      ],
    });

    const summary = message.content[0]?.text?.trim();

    if (!summary) {
      return res.status(500).json({ error: "No summary returned from AI." });
    }

    res.status(200).json({ summary });
  } catch (err) {
    console.error("Summary error:", err);
    res.status(500).json({ error: err.message || "Failed to generate summary." });
  }
}