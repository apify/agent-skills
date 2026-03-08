---
name: bycrawl-trend-analysis
description: Discover trending topics, hashtags, and viral content across TikTok, X/Twitter, Reddit, Instagram, Threads, Dcard, and Xiaohongshu. Use when user asks to find trends, track viral content, discover trending hashtags, or monitor emerging topics.
---

# Trend Analysis

Discover and track emerging trends across social media platforms using ByCrawl MCP tools.

## Prerequisites

- ByCrawl MCP server connected (`claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`)
- ByCrawl API key from [bycrawl.com](https://bycrawl.com)

## Workflow

### Step 1: Define Trend Scope

Ask the user:
1. What topic, industry, or niche?
2. Which platforms to monitor?
3. Geographic focus? (global, Asia, specific markets)
4. Purpose? (content strategy, product development, marketing timing)

### Step 2: Discover Trends

| Trend Source | ByCrawl MCP Tools | What You Get |
|-------------|-------------------|--------------|
| Viral short-form | TikTok browse by category, TikTok search | Trending videos and sounds |
| Real-time buzz | X/Twitter search tweets, Threads search posts | Breaking trends and hot takes |
| Community trends | Reddit search posts, Reddit get subreddit | Emerging topics in communities |
| Visual trends | Instagram search hashtags, TikTok search | Trending aesthetics and styles |
| Asian market trends | Xiaohongshu search notes, Dcard search posts | Regional trending topics |
| Video trends | YouTube search, TikTok search | Trending video content and formats |
| Professional trends | LinkedIn search users, LinkedIn get post | Industry thought leadership trends |

### Step 3: Analyze Trend Patterns

From collected data:
1. **Velocity** — how fast the topic is growing
2. **Volume** — total mentions across platforms
3. **Sentiment** — positive, negative, or mixed reactions
4. **Cross-platform spread** — is it trending on multiple platforms?
5. **Key voices** — who's driving the conversation?
6. **Content formats** — what types of content are performing best?

### Step 4: Deliver Trend Report

Present findings with:
- **Top trending topics** — ranked by velocity and volume
- **Platform breakdown** — where each trend is strongest
- **Content opportunities** — trending formats and themes to leverage
- **Timing insights** — how long trends have been building
- **Actionable recommendations** — what content to create now
- **Watch list** — emerging trends to monitor

## Error Handling

- `ByCrawl MCP not connected` — Run: `claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`
- `Invalid API key` — Check your key at [bycrawl.com](https://bycrawl.com)
- `No results found` — Try broader search terms
- `Rate limit exceeded` — Wait briefly and retry
