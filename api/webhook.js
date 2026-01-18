const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const BOT_ID = (process.env.GROUPME_BOT_ID || "").trim();

// Haiku 4.5 pricing per token
const INPUT_COST_PER_TOKEN = 0.80 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 4.00 / 1_000_000;
const HOURLY_BUDGET_CENTS = 10;

// In-memory rate limiting (resets on cold start)
let hourlySpendCents = 0;
let lastResetTime = Date.now();

function checkAndUpdateBudget(inputTokens, outputTokens) {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;

  if (now - lastResetTime > hourInMs) {
    hourlySpendCents = 0;
    lastResetTime = now;
  }

  const costCents = (inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN) * 100;

  if (hourlySpendCents + costCents > HOURLY_BUDGET_CENTS) {
    return { allowed: false, currentSpend: hourlySpendCents };
  }

  hourlySpendCents += costCents;
  return { allowed: true, currentSpend: hourlySpendCents };
}

async function postToGroupMe(text) {
  const response = await fetch("https://api.groupme.com/v3/bots/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bot_id: BOT_ID, text }),
  });
  return response.status === 202 || response.status === 200;
}

async function getClaudeResponse(message, senderName) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    system: `You are "Jackson's Frien" - a chill 23 year old AI in a group chat with Jackson and his high school friends.

Vibe:
- Jackson's hype man. Always got his back in debates. Back him up.
- Smooth, chill, effortlessly cool. Never try-hard.
- Drop a swear when it lands - "that's dope as hell", "damn he's right tho". Nothing forced.
- Light slang, don't overdo it.
- ONE-LINERS ONLY. Keep it short. One sentence max unless someone asks a real question.
- Still smart (Claude at heart) - give real answers when asked, just keep it casual.
- Light roasts welcome.
- NEVER use emojis.

Chatting with: ${senderName}
Jackson is the homie. Always.`,
    messages: [{ role: "user", content: message }],
  });

  return {
    text: response.content[0].text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens
  };
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    return res.status(200).json({ status: "Bot is running!" });
  }

  if (req.method === "POST") {
    try {
      const { text, name, sender_type } = req.body;

      // Ignore bot messages (prevent loops)
      if (sender_type === "bot") {
        return res.status(200).json({ status: "Ignored bot message" });
      }

      // Ignore empty messages
      if (!text || text.trim() === "") {
        return res.status(200).json({ status: "Ignored empty message" });
      }

      // Check trigger words
      const lowerText = text.toLowerCase();
      const shouldRespond =
        lowerText.includes("frien") ||
        lowerText.includes("bot") ||
        lowerText.includes("claude");

      if (!shouldRespond) {
        return res.status(200).json({ status: "Message not directed at bot" });
      }

      // Get Claude's response
      const claudeResult = await getClaudeResponse(text, name);

      // Check budget
      const budget = checkAndUpdateBudget(claudeResult.inputTokens, claudeResult.outputTokens);
      if (!budget.allowed) {
        return res.status(200).json({ status: "Rate limited" });
      }

      // Post to GroupMe
      await postToGroupMe(claudeResult.text);

      return res.status(200).json({ status: "Message sent" });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
