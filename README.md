# ByCrawl Agent Skills

Agent skills for social media data extraction across 12 platforms using ByCrawl MCP. Works with Claude Code, Cursor, Codex, Gemini CLI, and other AI coding assistants.

## Available skills

<!-- BEGIN_SKILLS_TABLE -->
| Name | Description | Documentation |
|------|-------------|---------------|
| `bycrawl-audience-analysis` | Understand audience demographics, behavior patterns, and engagement quality across Instagram, TikTok, YouTube, Threads, Reddit, and Facebook | [SKILL.md](skills/bycrawl-audience-analysis/SKILL.md) |
| `bycrawl-brand-monitoring` | Track brand mentions, sentiment, and reputation across Threads, X/Twitter, Facebook, Reddit, Instagram, TikTok, YouTube, Xiaohongshu, and Dcard | [SKILL.md](skills/bycrawl-brand-monitoring/SKILL.md) |
| `bycrawl-competitor-intelligence` | Analyze competitor social media presence, content strategy, and engagement across LinkedIn, Facebook, Instagram, TikTok, YouTube, X/Twitter, and Threads | [SKILL.md](skills/bycrawl-competitor-intelligence/SKILL.md) |
| `bycrawl-content-analytics` | Track engagement metrics and content performance across Instagram, TikTok, YouTube, Threads, Facebook, and X/Twitter | [SKILL.md](skills/bycrawl-content-analytics/SKILL.md) |
| `bycrawl-influencer-discovery` | Find and evaluate influencers for brand partnerships across Instagram, TikTok, YouTube, Xiaohongshu, and Threads | [SKILL.md](skills/bycrawl-influencer-discovery/SKILL.md) |
| `bycrawl-lead-generation` | Generate B2B/B2C leads from LinkedIn, Facebook, Instagram, X/Twitter, and 104 Job Bank using ByCrawl MCP tools | [SKILL.md](skills/bycrawl-lead-generation/SKILL.md) |
| `bycrawl-market-research` | Analyze market trends, consumer sentiment, and product validation across Reddit, Xiaohongshu, Dcard, X/Twitter, and other social platforms | [SKILL.md](skills/bycrawl-market-research/SKILL.md) |
| `bycrawl-social-scraper` | Universal social media data extraction across 12 platforms using ByCrawl MCP. Scrape data from Threads, X/Twitter, Facebook, Reddit, LinkedIn, Xiaohongshu, TikTok, Instagram, YouTube, Dcard, and 104 Job Bank for lead generation, brand monitoring, competitor analysis, influencer discovery, trend research, and more | [SKILL.md](skills/bycrawl-social-scraper/SKILL.md) |
| `bycrawl-trend-analysis` | Discover trending topics, hashtags, and viral content across TikTok, X/Twitter, Reddit, Instagram, Threads, Dcard, and Xiaohongshu | [SKILL.md](skills/bycrawl-trend-analysis/SKILL.md) |
<!-- END_SKILLS_TABLE -->

## Supported Platforms

| Platform | Tools | Examples |
|----------|-------|----------|
| Threads | 8 | Search posts, get user profile/replies, public feed |
| X/Twitter | 4 | Search tweets, get user timeline |
| Facebook | 4 | Get page, search posts, get post by URL |
| Reddit | 5 | Get subreddit, search posts, get user |
| LinkedIn | 7 | Get company, search jobs/users, get post |
| Xiaohongshu (RED) | 9 | Search notes, get comments, resolve share URL |
| TikTok | 7 | Get video, search, comments, subtitles, browse by category |
| Instagram | 5 | Search hashtags, get user/post, comments, user posts |
| YouTube | 5 | Get video/channel, search, comments, transcription |
| Dcard | 6 | Get post/forum, search posts, comments, persona |
| 104 Job Bank | 3 | Search jobs, get company/job details |

## Installation

### Claude Code

```bash
# Add ByCrawl MCP server
claude mcp add bycrawl -e BYCRAWL_API_KEY=sk_byc_xxx -- npx -y @bycrawl/mcp
```

### Claude Desktop / Cursor

Add to your MCP config:

```json
{
  "mcpServers": {
    "bycrawl": {
      "command": "npx",
      "args": ["-y", "@bycrawl/mcp"],
      "env": {
        "BYCRAWL_API_KEY": "sk_byc_xxx"
      }
    }
  }
}
```

### Codex / Gemini CLI

Point your agent to the `agents/AGENTS.md` file which contains skill descriptions and paths:

```bash
# Gemini CLI uses gemini-extension.json automatically
# For Codex, reference agents/AGENTS.md in your configuration
```

### Other AI tools

Any AI tool that supports Markdown context can use the skills by pointing to:
- `agents/AGENTS.md` - auto-generated skill index
- `skills/*/SKILL.md` - individual skill documentation

## Prerequisites

1. **ByCrawl account** - [bycrawl.com](https://bycrawl.com)
2. **API key** - get from [bycrawl.com](https://bycrawl.com), set as `BYCRAWL_API_KEY`

## Output formats

- **Quick answer** - top results displayed in chat (no file saved)
- **CSV** - full export with all fields
- **JSON** - full data export

## Contributing

1. Fork this repository.
2. Create your skill in `skills/your-skill-name/`.
3. Add `SKILL.md` with proper frontmatter:
   ```yaml
   ---
   name: your-skill-name
   description: What your skill does and when to use it
   ---
   ```
4. Add entry to `.claude-plugin/marketplace.json`.
5. Run `uv run scripts/generate_agents.py` to update AGENTS.md.
6. Submit a pull request.

## Development

```bash
# Regenerate AGENTS.md and validate marketplace.json
uv run scripts/generate_agents.py
```

## Support

- [ByCrawl Documentation](https://bycrawl.com)
- [ByCrawl MCP on npm](https://www.npmjs.com/package/@bycrawl/mcp)
