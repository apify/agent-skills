---
name: bycrawl-brand-monitoring
description: Track brand mentions, sentiment, and reputation across Threads, X/Twitter, Facebook, Reddit, Instagram, TikTok, YouTube, Xiaohongshu, and Dcard. Use when user asks to monitor brand reputation, analyze mentions, track sentiment, or gather customer feedback.
---

# Brand Reputation Monitoring

Track brand mentions, sentiment, and customer feedback across social media platforms using ByCrawl MCP tools.

## Prerequisites

- ByCrawl MCP server connected (`claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`)
- ByCrawl API key from [bycrawl.com](https://bycrawl.com)

## Workflow

### Step 1: Understand the Brand and Goals

Ask the user:
1. What brand/product/company to monitor?
2. Which platforms matter most? (or monitor all)
3. What timeframe? (recent mentions vs. historical)
4. Any specific concerns? (negative reviews, competitor mentions, campaign tracking)

### Step 2: Search for Brand Mentions

Based on the user's priorities, call ByCrawl MCP tools to search for the brand across platforms:

| Monitoring Goal | ByCrawl MCP Tools | What You Get |
|----------------|-------------------|--------------|
| Real-time mentions | X/Twitter search tweets, Threads search posts | Live brand discussions |
| Community sentiment | Reddit search posts, Dcard search posts | Organic user opinions |
| Visual brand tracking | Instagram search hashtags, TikTok search | Brand-tagged content |
| Video mentions | YouTube search, YouTube comments | Video reviews and reactions |
| Professional reputation | LinkedIn get company, LinkedIn get post | B2B brand perception |
| Chinese market sentiment | Xiaohongshu search notes, Xiaohongshu comments | Product reviews in Chinese market |
| Business page monitoring | Facebook get page, Facebook search posts | Page engagement and feedback |

### Step 3: Analyze Sentiment and Patterns

For each platform's results:
1. Categorize mentions as positive, negative, or neutral
2. Identify recurring themes and complaints
3. Flag urgent issues (viral negative content, PR crises)
4. Note engagement levels (likes, comments, shares)

### Step 4: Compile Report

Present findings with:
- **Mention volume** by platform
- **Sentiment breakdown** (positive/negative/neutral percentages)
- **Top mentions** — most engaged posts about the brand
- **Key themes** — recurring topics in brand discussions
- **Alert items** — any negative viral content or emerging issues
- **Recommendations** — suggested actions based on findings

### Step 5: Offer Follow-ups

| Finding | Suggested Follow-up |
|---------|-------------------|
| Negative reviews | Deep-dive into specific platform comments |
| Competitor mentions | Switch to competitor intelligence skill |
| Influencer mentions | Switch to influencer discovery skill |
| Trending discussion | Switch to trend analysis skill |

## Error Handling

- `ByCrawl MCP not connected` — Run: `claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`
- `Invalid API key` — Check your key at [bycrawl.com](https://bycrawl.com)
- `No results found` — Try broader search terms or check spelling
- `Rate limit exceeded` — Wait briefly and retry
