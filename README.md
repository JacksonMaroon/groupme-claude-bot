# GroupMe Claude Bot

A serverless GroupMe chatbot powered by Claude AI (Haiku 4.5). Responds to messages in group chats with a customizable personality.

## Features

- **AI-Powered Responses** - Uses Claude Haiku 4.5 for fast, cheap responses
- **Trigger Words** - Only responds when mentioned (configurable)
- **Rate Limiting** - Built-in hourly budget cap to control API costs
- **Serverless** - Runs on Vercel with zero infrastructure management

## Architecture

```
GroupMe → Webhook Callback → Vercel Serverless Function → Claude API → GroupMe
```

## Setup

### 1. Create a GroupMe Bot

1. Go to [dev.groupme.com](https://dev.groupme.com)
2. Click "Bots" → "Create Bot"
3. Select your group and name your bot
4. Note the **Bot ID**

### 2. Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key

### 3. Deploy to Vercel

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/groupme-claude-bot.git
cd groupme-claude-bot

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables
vercel env add ANTHROPIC_API_KEY
vercel env add GROUPME_BOT_ID

# Deploy to production
vercel --prod
```

### 4. Set Callback URL

Go back to [dev.groupme.com/bots](https://dev.groupme.com/bots), edit your bot, and set the Callback URL to:

```
https://your-project.vercel.app/api/webhook
```

## Configuration

Edit `api/webhook.js` to customize:

- **Trigger words** - What activates the bot (default: "frien", "bot", "claude")
- **Personality** - The system prompt that defines the bot's vibe
- **Rate limits** - Hourly budget in cents (default: 10 cents/hour)
- **Max tokens** - Response length limit (default: 150)

## Cost

Using Claude Haiku 4.5:
- Input: $0.80 / 1M tokens
- Output: $4.00 / 1M tokens
- ~250+ messages per 10 cents

## License

MIT
