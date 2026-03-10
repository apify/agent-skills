# Apify Agent Skills

Official Apify plugins for AI coding assistants. Works with Claude Code, Cursor, Codex, Gemini CLI, and other AI tools.

> Looking for more specialized skills? Check out [apify/awesome-skills](https://github.com/apify/awesome-skills) — a community collection of domain-specific skills for lead generation, brand monitoring, competitor intelligence, and more.

## Plugins

### `apify-scraper`

Universal AI-powered web scraper for 55+ platforms. One skill that covers all data extraction use cases.

- **Skill**: `apify-ultimate-scraper` — scrape data from Instagram, Facebook, TikTok, YouTube, Google Maps, Amazon, Walmart, eBay, Booking.com, TripAdvisor, and 45+ more platforms
- **Use cases**: lead generation, brand monitoring, competitor analysis, influencer discovery, trend research, content analytics, audience analysis, e-commerce pricing, reviews

### `apify-dev-tools`

Build, deploy, and convert projects into Apify Actors with full platform integration.

- **Skills**:
  - `apify-actor-development` — create, debug, and deploy Actors from scratch (JS/TS/Python)
  - `apify-actorization` — convert existing projects into Actors
- **Command**: `/create-actor` — guided 10-phase Actor creation workflow
- **MCP server**: Apify platform access (docs, Actor search, run logs, storage)

## Available Skills

<!-- BEGIN_SKILLS_TABLE -->
| Name | Description | Documentation |
|------|-------------|---------------|
| `apify-scraper` | Universal AI-powered web scraper for 55+ platforms. Scrape data from Instagram, Facebook, TikTok, YouTube, Google Maps, Google Search, Google Trends, Booking.com, TripAdvisor, Amazon, Walmart, eBay, and more for lead generation, brand monitoring, competitor analysis, influencer discovery, trend research, content analytics, audience analysis, e-commerce pricing, and reviews | [SKILL.md](plugins/apify-scraper/skills/apify-ultimate-scraper/SKILL.md) |
| `apify-dev-tools` | Develop, debug, deploy, and convert projects into Apify Actors - serverless cloud programs for web scraping, automation, and data processing | [SKILL.md](plugins/apify-dev-tools/skills/apify-actor-development/SKILL.md) |
<!-- END_SKILLS_TABLE -->

## Installation

### Claude Code

```bash
# Add the marketplace
/plugin marketplace add apify/agent-skills

# Install plugins
/plugin install apify-scraper@apify-agent-skills
/plugin install apify-dev-tools@apify-agent-skills
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
- `plugins/*/skills/*/SKILL.md` - individual skill documentation

## Prerequisites

1. **Apify account** - [apify.com](https://apify.com)
2. **API token** - get from [Apify Console](https://console.apify.com/account/integrations), add `APIFY_TOKEN=your_token` to `.env`
3. **Node.js 20.6+**
4. **[mcpc CLI](https://github.com/apify/mcp-cli)** - `npm install -g @apify/mcpc`

## Pricing

Apify Actors use pay-per-result pricing. Check individual Actor pricing on the [Apify platform](https://apify.com).

## Contributing

1. Fork this repository.
2. Create your skill in the appropriate plugin under `plugins/`.
3. Add `SKILL.md` with proper frontmatter:
   ```yaml
   ---
   name: your-skill-name
   description: What your skill does and when to use it
   ---
   ```
4. Update `.claude-plugin/marketplace.json`.
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

## License

[Apache-2.0](LICENSE)
