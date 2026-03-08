---
name: bycrawl-influencer-discovery
description: Find and evaluate influencers for brand partnerships across Instagram, TikTok, YouTube, Xiaohongshu, and Threads. Use when user asks to find influencers, evaluate creators, plan influencer campaigns, or discover KOLs.
---

# Influencer Discovery

Find, evaluate, and shortlist influencers for brand partnerships using ByCrawl MCP tools.

## Prerequisites

- ByCrawl MCP server connected (`claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`)
- ByCrawl API key from [bycrawl.com](https://bycrawl.com)

## Workflow

### Step 1: Define Influencer Criteria

Ask the user:
1. What niche or industry?
2. Which platforms? (Instagram, TikTok, YouTube, Xiaohongshu, Threads)
3. Audience size preference? (nano, micro, mid-tier, macro, mega)
4. Geographic market?
5. Budget range?

### Step 2: Discover Influencers

| Discovery Method | ByCrawl MCP Tools | What You Get |
|-----------------|-------------------|--------------|
| Hashtag search | Instagram search hashtags, TikTok search | Creators posting in niche |
| Profile analysis | Instagram get user, YouTube get channel | Follower counts, bio, content focus |
| Content search | TikTok search, YouTube search | Top creators for specific topics |
| Chinese market KOLs | Xiaohongshu search notes | Key opinion leaders on RED |
| Conversation leaders | Threads search posts, X/Twitter search tweets | Thought leaders in discussions |
| Comment engagement | Instagram comments, TikTok comments, YouTube comments | How creators interact with audience |

### Step 3: Evaluate Influencers

For each candidate:
1. **Reach** — follower/subscriber counts across platforms
2. **Engagement quality** — comment-to-like ratio, reply frequency
3. **Content relevance** — how well their content fits the brand
4. **Audience authenticity** — quality of comments (real vs. spam)
5. **Cross-platform presence** — activity on multiple platforms
6. **Content style** — tone, production quality, posting frequency

Use these tools for deeper evaluation:
- Instagram get user posts — analyze recent content themes
- YouTube comments / TikTok comments — gauge audience quality
- YouTube transcription — understand content depth and messaging

### Step 4: Deliver Shortlist

Present a ranked list with:
- **Influencer profiles** — name, platform handles, follower counts
- **Engagement metrics** — average likes, comments, engagement rate
- **Content fit score** — relevance to the brand (high/medium/low)
- **Platform strengths** — where each influencer performs best
- **Estimated reach** — combined audience across platforms
- **Recommendations** — top picks with rationale

## Error Handling

- `ByCrawl MCP not connected` — Run: `claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`
- `Invalid API key` — Check your key at [bycrawl.com](https://bycrawl.com)
- `No results found` — Try broader hashtags or different search terms
- `Rate limit exceeded` — Wait briefly and retry
