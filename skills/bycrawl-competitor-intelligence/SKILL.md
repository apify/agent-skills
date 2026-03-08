---
name: bycrawl-competitor-intelligence
description: Analyze competitor social media presence, content strategy, and engagement across LinkedIn, Facebook, Instagram, TikTok, YouTube, X/Twitter, and Threads. Use when user asks to research competitors, benchmark performance, or analyze rival strategies.
---

# Competitor Intelligence

Analyze competitor strategies, content performance, and market positioning across social media using ByCrawl MCP tools.

## Prerequisites

- ByCrawl MCP server connected (`claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`)
- ByCrawl API key from [bycrawl.com](https://bycrawl.com)

## Workflow

### Step 1: Identify Competitors

Ask the user:
1. Which competitors to analyze?
2. What aspects? (content strategy, engagement, audience, messaging)
3. Which platforms are most important?
4. Benchmarking against the user's own brand?

### Step 2: Gather Competitor Data

| Analysis Area | ByCrawl MCP Tools | What You Get |
|--------------|-------------------|--------------|
| Company profile | LinkedIn get company, Facebook get page | Company size, description, presence |
| Content strategy | Instagram get user posts, TikTok search, YouTube get channel | Content frequency, types, themes |
| Engagement metrics | Instagram get post, YouTube get video, TikTok get video | Likes, comments, shares per post |
| Audience reactions | YouTube comments, TikTok comments, Instagram comments | Sentiment, feedback patterns |
| Brand messaging | Threads search posts, X/Twitter search tweets | How competitors communicate |
| Professional presence | LinkedIn get post, LinkedIn get company | B2B positioning, thought leadership |
| Community perception | Reddit search posts, Dcard search posts | Organic discussions about competitors |

### Step 3: Analyze and Compare

For each competitor:
1. Content volume and posting frequency
2. Engagement rates across platforms
3. Content themes and messaging patterns
4. Audience sentiment in comments
5. Platform strengths and weaknesses

### Step 4: Deliver Competitive Report

Present a comparative analysis with:
- **Platform presence** — where each competitor is active
- **Content strategy** — posting frequency, content types, themes
- **Engagement benchmarks** — average likes, comments, shares
- **Audience sentiment** — positive/negative comment ratios
- **Gaps and opportunities** — where competitors are weak
- **Recommendations** — actionable insights for the user

## Error Handling

- `ByCrawl MCP not connected` — Run: `claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`
- `Invalid API key` — Check your key at [bycrawl.com](https://bycrawl.com)
- `No results found` — Verify competitor names/handles, try alternative spellings
- `Rate limit exceeded` — Wait briefly and retry
