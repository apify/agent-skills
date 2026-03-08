---
name: bycrawl-social-scraper
description: Universal social media data extraction across 12 platforms using ByCrawl MCP. Use for any social media scraping task including lead generation, brand monitoring, competitor analysis, influencer discovery, trend research, content analytics, or audience analysis.
---

# Universal Social Media Scraper

Extract data from 12 social media platforms using ByCrawl MCP tools. This skill automatically selects the best tools for your task.

## Prerequisites

- ByCrawl MCP server connected (`claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`)
- ByCrawl API key from [bycrawl.com](https://bycrawl.com)

## Workflow

### Step 1: Understand the Goal

Ask the user what they want to extract and from which platforms. Map their goal to the right combination of ByCrawl MCP tools.

### Step 2: Select Platform Tools

#### Tool Selection by Platform

| Platform | Available Tools | Best For |
|----------|----------------|----------|
| Threads | Search posts, get user profile, get replies, public feed | Brand mentions, trending discussions |
| X/Twitter | Search tweets, get user timeline | Real-time sentiment, news monitoring |
| Facebook | Get page, search posts, get post by URL | Business pages, community discussions |
| Reddit | Get subreddit, search posts, get user | Market research, product feedback |
| LinkedIn | Get company, search jobs/users, get post | B2B leads, job market analysis |
| Xiaohongshu | Search notes, get comments, resolve share URL | Chinese market trends, product reviews |
| TikTok | Get video, search, comments, subtitles, browse category | Viral content, influencer discovery |
| Instagram | Search hashtags, get user/post, comments, user posts | Influencer marketing, brand tracking |
| YouTube | Get video/channel, search, comments, transcription | Content analysis, competitor research |
| Dcard | Get post/forum, search posts, comments, persona | Taiwan market research, youth trends |
| 104 Job Bank | Search jobs, get company/job details | Job market intelligence, hiring trends |

#### Tool Selection by Use Case

| Use Case | Primary Tools |
|----------|--------------|
| Lead Generation | LinkedIn (search users/companies), Facebook (get page), 104 Job Bank |
| Brand Monitoring | Threads (search), X/Twitter (search), Instagram (search hashtags), Reddit (search) |
| Competitor Analysis | LinkedIn (get company), Facebook (get page), Instagram (get user), YouTube (get channel) |
| Influencer Discovery | Instagram (get user, user posts), TikTok (search), YouTube (get channel), Xiaohongshu (search) |
| Trend Research | TikTok (browse category), Reddit (get subreddit), Dcard (search), X/Twitter (search) |
| Content Analytics | YouTube (get video, transcription), TikTok (get video, comments), Instagram (get post, comments) |
| Market Research | Reddit (search), Xiaohongshu (search), Dcard (search), 104 Job Bank (search) |
| Audience Analysis | Instagram (get user, comments), TikTok (comments), YouTube (comments), Threads (get replies) |

### Step 3: Execute MCP Tool Calls

Call the selected ByCrawl MCP tools directly. No scripts or CLI needed — the tools are available as MCP function calls.

For multi-platform tasks, chain tool calls across platforms to build a comprehensive dataset.

### Step 4: Process and Present Results

After collecting data:
1. Aggregate results across platforms
2. Present key findings in a summary
3. Offer to export as CSV or JSON if needed
4. Suggest follow-up queries for deeper analysis

#### Multi-Platform Workflows

| Workflow | Step 1 | Step 2 | Step 3 |
|----------|--------|--------|--------|
| Brand health check | X/Twitter search mentions | Instagram search hashtags | Reddit search feedback |
| Influencer vetting | Instagram get user profile | YouTube get channel | TikTok search creator |
| Competitor deep-dive | LinkedIn get company | Facebook get page | Instagram get user posts |
| Market validation | Reddit search opinions | Xiaohongshu search reviews | Dcard search discussions |
| Job market analysis | 104 Job Bank search | LinkedIn search jobs | LinkedIn get company |

## Error Handling

- `ByCrawl MCP not connected` — Run: `claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`
- `Invalid API key` — Check your key at [bycrawl.com](https://bycrawl.com)
- `Rate limit exceeded` — Wait briefly and retry, or reduce request frequency
- `Platform temporarily unavailable` — Try alternative platforms for similar data
