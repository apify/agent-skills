---
name: bycrawl-content-analytics
description: Track engagement metrics and content performance across Instagram, TikTok, YouTube, Threads, Facebook, and X/Twitter. Use when user asks to analyze content performance, measure engagement, track campaign ROI, or benchmark content metrics.
---

# Content Analytics

Track engagement metrics, measure content performance, and analyze campaign results using ByCrawl MCP tools.

## Prerequisites

- ByCrawl MCP server connected (`claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`)
- ByCrawl API key from [bycrawl.com](https://bycrawl.com)

## Workflow

### Step 1: Define Analytics Scope

Ask the user:
1. Whose content to analyze? (own brand, competitor, campaign)
2. Which platforms?
3. What metrics matter most? (engagement, reach, sentiment)
4. Time period?

### Step 2: Collect Content Data

| Analytics Goal | ByCrawl MCP Tools | What You Get |
|---------------|-------------------|--------------|
| Post performance | Instagram get post, TikTok get video, YouTube get video | Likes, views, shares per post |
| Account overview | Instagram get user, YouTube get channel, TikTok search | Overall account metrics |
| Content catalog | Instagram get user posts, YouTube search | Full content history with metrics |
| Audience reactions | Instagram comments, TikTok comments, YouTube comments | Comment sentiment and themes |
| Video depth | YouTube transcription, TikTok subtitles | Content topics and messaging |
| Cross-platform reach | Threads search, X/Twitter search, Facebook search | Mentions and reposts |

### Step 3: Analyze Performance

Calculate and compare:
1. **Engagement rate** — (likes + comments + shares) / reach
2. **Content type performance** — which formats perform best
3. **Posting patterns** — optimal times and frequency
4. **Top performing content** — highest engagement posts
5. **Comment sentiment** — audience reaction quality
6. **Growth trajectory** — follower/subscriber trends

### Step 4: Deliver Analytics Report

Present findings with:
- **Performance summary** — key metrics across platforms
- **Top content** — best performing posts with engagement data
- **Content mix analysis** — which types resonate most
- **Engagement trends** — patterns over the analysis period
- **Audience insights** — what drives comments and shares
- **Recommendations** — what to create more/less of

## Error Handling

- `ByCrawl MCP not connected` — Run: `claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`
- `Invalid API key` — Check your key at [bycrawl.com](https://bycrawl.com)
- `No results found` — Verify account handles or post URLs
- `Rate limit exceeded` — Wait briefly and retry
