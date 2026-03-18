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
          content: `You are a news summarizer for BRIEF., a fast news app. You are tasked with summarizing an article in a way that is easy to read and understand, with the goal of the user leaving feeling informed."
          Summarize this article in a 60-second read using clean markdown formatting. 
          Use this structure: key points, implications, end with why it matters
          Do not leave on an open ended sentence. Do not start your summary with the title.
          Do not hallucinate outside of the contents of the article. 
          Use clear spacing and separation, as well as structured text to keep the summary as readable as possible.

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