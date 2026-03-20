# Apify Agent Skills

Official Apify Agent Skills for web scraping, data extraction, and automation. Works with Claude Code, Cursor, Codex, Gemini CLI, and other AI coding assistants.

## Available skills

<!-- BEGIN_SKILLS_TABLE -->
| Name | Description | Documentation |
|------|-------------|---------------|
| `apify-actor-development` | Develop, debug, and deploy Apify Actors - serverless cloud programs for web scraping, automation, and data processing | [SKILL.md](skills/apify-actor-development/SKILL.md) |
| `apify-actorization` | Convert existing projects into Apify Actors - serverless cloud programs. Actorize JavaScript/TypeScript (SDK with Actor.init/exit), Python (async context manager), or any language (CLI wrapper). Use when migrating code to Apify, wrapping CLI tools as Actors, or adding Actor SDK to existing projects. | [SKILL.md](skills/apify-actorization/SKILL.md) |
| `apify-audience-analysis` | Understand audience demographics, preferences, behavior patterns, and engagement quality across Facebook, Instagram, YouTube, and TikTok | [SKILL.md](skills/apify-audience-analysis/SKILL.md) |
| `apify-brand-reputation-monitoring` | Track reviews, ratings, sentiment, and brand mentions across Google Maps, Booking.com, TripAdvisor, Facebook, Instagram, YouTube, and TikTok | [SKILL.md](skills/apify-brand-reputation-monitoring/SKILL.md) |
| `apify-competitor-intelligence` | Analyze competitor strategies, content, pricing, ads, and market positioning across Google Maps, Booking.com, Facebook, Instagram, YouTube, and TikTok | [SKILL.md](skills/apify-competitor-intelligence/SKILL.md) |
| `apify-content-analytics` | Track engagement metrics, measure campaign ROI, and analyze content performance across Instagram, Facebook, YouTube, and TikTok | [SKILL.md](skills/apify-content-analytics/SKILL.md) |
| `apify-ecommerce` | Scrape e-commerce data for pricing intelligence, customer sentiment, product research, quality analysis, and supply chain monitoring across Amazon, Walmart, eBay, IKEA, and 50+ marketplaces | [SKILL.md](skills/apify-ecommerce/SKILL.md) |
| `apify-generate-output-schema` | Generate output schemas (dataset_schema.json, output_schema.json, key_value_store_schema.json) for an Apify Actor by analyzing its source code | [SKILL.md](skills/apify-generate-output-schema/SKILL.md) |
| `apify-influencer-discovery` | Find and evaluate influencers for brand partnerships, verify authenticity, and track collaboration performance across Instagram, Facebook, YouTube, and TikTok | [SKILL.md](skills/apify-influencer-discovery/SKILL.md) |
| `apify-lead-generation` | Generate B2B/B2C leads by scraping Google Maps, websites, Instagram, TikTok, Facebook, LinkedIn, YouTube, and Google Search using Apify Actors | [SKILL.md](skills/apify-lead-generation/SKILL.md) |
| `apify-market-research` | Analyze market conditions, geographic opportunities, pricing, consumer behavior, and product validation across Google Maps, Facebook, Instagram, Booking.com, and TripAdvisor | [SKILL.md](skills/apify-market-research/SKILL.md) |
| `apify-trend-analysis` | Discover and track emerging trends across Google Trends, Instagram, Facebook, YouTube, and TikTok to inform content strategy | [SKILL.md](skills/apify-trend-analysis/SKILL.md) |
| `apify-ultimate-scraper` | Universal AI-powered web scraper for any platform. Scrape data from Instagram, Facebook, TikTok, YouTube, Google Maps, Google Search, Google Trends, Booking.com, and TripAdvisor for lead generation, brand monitoring, competitor analysis, influencer discovery, trend research, and more | [SKILL.md](skills/apify-ultimate-scraper/SKILL.md) |
<!-- END_SKILLS_TABLE -->

## Installation

```bash
npx skills add apify/agent-skills
```

### Claude Code

```bash
# Add the marketplace
/plugin marketplace add https://github.com/apify/agent-skills

# Install a skill
/plugin install apify-ultimate-scraper@apify-agent-skills
```

### Cursor / Windsurf

Add to your project's `.cursor/settings.json` or use the same Claude Code plugin format.

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

1. **Apify account** - [apify.com](https://apify.com)
2. **API token** - get from [Apify Console](https://console.apify.com/account/integrations), add `APIFY_TOKEN=your_token` to `.env`
3. **Node.js 20.6+**
4. **[mcpc CLI](https://github.com/apify/mcp-cli)** - `npm install -g @apify/mcpc`

## Output formats

- **Quick answer** - top 5 results displayed in chat (no file saved)
- **CSV** - full export with all fields
- **JSON** - full data export

## Pricing

Apify Actors use pay-per-result pricing. Check individual Actor pricing on the [Apify platform](https://apify.com).

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

- [Apify Documentation](https://docs.apify.com)
- [Apify Discord](https://discord.gg/jyEM2PRvMU)
