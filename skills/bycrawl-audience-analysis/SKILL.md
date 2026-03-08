---
name: bycrawl-audience-analysis
description: Understand audience demographics, behavior patterns, and engagement quality across Instagram, TikTok, YouTube, Threads, Reddit, and Facebook. Use when user asks to analyze audiences, understand followers, segment users, or study engagement patterns.
---

# Audience Analysis

Understand audience demographics, preferences, and behavior patterns using ByCrawl MCP tools.

## Prerequisites

- ByCrawl MCP server connected (`claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`)
- ByCrawl API key from [bycrawl.com](https://bycrawl.com)

## Workflow

### Step 1: Define Audience Scope

Ask the user:
1. Whose audience to analyze? (own brand, competitor, industry)
2. Which platforms?
3. What insights needed? (demographics, interests, engagement quality)
4. Specific segments to study?

### Step 2: Collect Audience Data

| Analysis Goal | ByCrawl MCP Tools | What You Get |
|--------------|-------------------|--------------|
| Follower profiles | Instagram get user, YouTube get channel | Audience size and growth |
| Engagement quality | Instagram comments, TikTok comments, YouTube comments | Comment authenticity and sentiment |
| Audience interests | Instagram search hashtags, Reddit get subreddit | What the audience cares about |
| Discussion patterns | Threads get replies, Dcard comments | How audience communicates |
| Professional audience | LinkedIn search users, LinkedIn get company | B2B audience demographics |
| Community behavior | Reddit get user, Dcard get persona | Individual user behavior patterns |
| Content preferences | Instagram get user posts, TikTok get video | What content gets most engagement |

### Step 3: Analyze Audience Patterns

From collected data:
1. **Audience size** — follower counts across platforms
2. **Engagement quality** — real engagement vs. passive followers
3. **Comment analysis** — language, sentiment, topics
4. **Active times** — when the audience is most engaged
5. **Content preferences** — what types of posts drive interaction
6. **Cross-platform overlap** — audience presence on multiple platforms

### Step 4: Deliver Audience Report

Present findings with:
- **Audience overview** — size, growth, platform distribution
- **Engagement quality score** — real vs. superficial engagement
- **Audience interests** — topics and themes that resonate
- **Behavioral patterns** — how the audience interacts with content
- **Segment insights** — key audience groups identified
- **Recommendations** — how to better engage the audience

## Error Handling

- `ByCrawl MCP not connected` — Run: `claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`
- `Invalid API key` — Check your key at [bycrawl.com](https://bycrawl.com)
- `No results found` — Verify account handles
- `Rate limit exceeded` — Wait briefly and retry
