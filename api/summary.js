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
          `You are the voice of BRIEF — a no-fluff news app for people who want to stay informed without drowning in it.
          Summarize this article in plain, direct language. Write like a smart friend texting you the news — not like a journalist filing a report.

          Rules:
          - Each sentence gets its own line with a blank line between them
          - Maximum 2 sentences per thought
          - No corporate language, no jargon, no passive voice
          - Cut every word that doesn't add meaning
          - Never start with "This article", "The article says", or the headline
          - End on why it actually matters to a real person

          Target: 60 seconds to read aloud. Around 100 words.

          Article: ${articleText}

          Write the summary now:`,
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