import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { title, description, content } = req.query;

  const articleText = [title, description, content]
    .filter(Boolean)
    .join(" ")
    .slice(0, 2000);

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 120,
      messages: [
        {
          role: "user",
          content: `You are a news summarizer for BRIEF, a fast news app. Your job is to write a spoken summary of a news article that takes approximately 35 seconds to read aloud — roughly 100-130 words. 

Rules:
- Start directly with the news, no preamble
- Plain conversational language, no jargon
- One paragraph, no bullet points
- End with why it matters in one sentence
- Never say "the article says" or "according to"

Article:
${articleText}

Write the 35-second summary now:`,
        },
      ],
    });

    const summary = message.content[0].text.trim();
    res.status(200).json({ summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}