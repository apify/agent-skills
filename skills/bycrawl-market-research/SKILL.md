---
name: bycrawl-market-research
description: Analyze market trends, consumer sentiment, and product validation across Reddit, Xiaohongshu, Dcard, X/Twitter, and other social platforms. Use when user asks to research markets, validate products, understand consumer behavior, or analyze industry trends.
---

# Market Research

Analyze market conditions, consumer sentiment, and product validation using social media data from ByCrawl MCP tools.

## Prerequisites

- ByCrawl MCP server connected (`claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`)
- ByCrawl API key from [bycrawl.com](https://bycrawl.com)

## Workflow

### Step 1: Define Research Scope

Ask the user:
1. What market or product category?
2. Which geographic markets? (global, Asia, Taiwan, etc.)
3. What questions need answering? (demand validation, pricing, pain points)
4. Target audience demographics?

### Step 2: Collect Market Data

| Research Goal | ByCrawl MCP Tools | What You Get |
|--------------|-------------------|--------------|
| Consumer opinions | Reddit search posts, Dcard search posts | Unfiltered user discussions |
| Product reviews | Xiaohongshu search notes, Xiaohongshu comments | Chinese market product sentiment |
| Industry discussions | X/Twitter search tweets, Threads search posts | Real-time market conversations |
| Job market trends | 104 Job Bank search jobs, LinkedIn search jobs | Hiring patterns, skill demand |
| Video reviews | YouTube search, YouTube transcription | Detailed product/service reviews |
| Visual trends | Instagram search hashtags, TikTok search | Visual content trends in market |
| Community feedback | Reddit get subreddit, Dcard get forum | Dedicated community opinions |

### Step 3: Analyze Market Signals

From collected data:
1. **Demand signals** — frequency of product/service mentions
2. **Pain points** — recurring complaints and unmet needs
3. **Sentiment trends** — positive vs. negative over time
4. **Competitive landscape** — which brands are discussed most
5. **Price sensitivity** — discussions about pricing and value
6. **Feature requests** — what consumers wish existed

### Step 4: Deliver Research Report

Present findings with:
- **Market overview** — size of conversation, key platforms
- **Consumer sentiment** — overall mood and key themes
- **Competitive mentions** — which brands dominate discussions
- **Opportunities** — gaps in the market based on user feedback
- **Risks** — negative trends or concerns to watch
- **Recommendations** — data-backed suggestions for market entry or product development

## Error Handling

- `ByCrawl MCP not connected` — Run: `claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`
- `Invalid API key` — Check your key at [bycrawl.com](https://bycrawl.com)
- `No results found` — Try broader terms or different platforms
- `Rate limit exceeded` — Wait briefly and retry
