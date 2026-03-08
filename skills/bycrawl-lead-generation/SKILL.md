---
name: bycrawl-lead-generation
description: Generate B2B/B2C leads from LinkedIn, Facebook, Instagram, X/Twitter, and 104 Job Bank using ByCrawl MCP. Use when user asks to find leads, prospects, businesses, build lead lists, or scrape profiles for sales outreach.
---

# Lead Generation

Find and collect leads from social media platforms using ByCrawl MCP tools.

## Prerequisites

- ByCrawl MCP server connected (`claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`)
- ByCrawl API key from [bycrawl.com](https://bycrawl.com)

## Workflow

### Step 1: Understand Lead Requirements

Ask the user:
1. What type of leads? (B2B companies, B2C consumers, job candidates, influencers)
2. Industry or niche?
3. Geography or market?
4. Desired output? (company names, contact info, profiles, job listings)

### Step 2: Select Lead Sources

| Lead Type | ByCrawl MCP Tools | What You Get |
|-----------|-------------------|--------------|
| B2B companies | LinkedIn get company, LinkedIn search users | Company profiles, key people |
| B2B decision makers | LinkedIn search users, LinkedIn get post | Professional profiles, engagement |
| Job candidates | 104 Job Bank search jobs, LinkedIn search users | Candidate pools, salary benchmarks |
| Business pages | Facebook get page, Instagram get user | Business presence, engagement metrics |
| Influencer leads | Instagram get user, TikTok search, YouTube get channel | Creator profiles, audience size |
| Competitor customers | Reddit search posts, X/Twitter search tweets | People discussing competitors |
| Local businesses | Facebook search posts, 104 Job Bank get company | Local market presence |

### Step 3: Execute Lead Collection

Call the selected ByCrawl MCP tools to gather lead data. For comprehensive lead lists, chain multiple tools:

| Workflow | Step 1 | Step 2 |
|----------|--------|--------|
| B2B prospecting | LinkedIn search users by industry | LinkedIn get company for each match |
| Hiring intelligence | 104 Job Bank search jobs | LinkedIn get company for employers |
| Influencer outreach | Instagram search hashtags in niche | Instagram get user for top creators |
| Market entry | Facebook search posts in target market | LinkedIn search companies in region |

### Step 4: Process and Deliver

1. Compile leads into a structured list
2. Deduplicate across platforms
3. Highlight high-quality leads (high engagement, relevant industry)
4. Offer export as CSV or JSON
5. Suggest enrichment strategies (cross-reference across platforms)

## Error Handling

- `ByCrawl MCP not connected` — Run: `claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp`
- `Invalid API key` — Check your key at [bycrawl.com](https://bycrawl.com)
- `No results found` — Try broader search terms or different platforms
- `Rate limit exceeded` — Wait briefly and retry
