<p align="center">
  <img src="https://docs.apify.com/img/apify_logo.svg" alt="Apify" width="96" height="96">
</p>

<h1 align="center">Apify Agent Skills</h1>

<p align="center">
  <strong>Production-grade web scraping and automation skills for AI coding agents</strong>
</p>

<p align="center">
  <a href="https://apify.com"><img src="https://img.shields.io/badge/Powered%20by-Apify-20A34E?style=for-the-badge" alt="Powered by Apify"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache--2.0-555555?style=for-the-badge" alt="Apache 2.0"></a>
  <a href="#skills"><img src="https://img.shields.io/badge/Skills-4-246DFF?style=for-the-badge" alt="4 Skills"></a>
  <a href="https://apify.com/store"><img src="https://img.shields.io/badge/Actors-25%2C000%2B-F86606?style=for-the-badge" alt="25,000+ Actors"></a>
  <a href="https://mcp.apify.com/"><img src="https://img.shields.io/badge/MCP-Compatible-15C1E6?style=for-the-badge" alt="MCP Compatible"></a>
  <a href="https://github.com/apify/agent-skills/stargazers"><img src="https://img.shields.io/github/stars/apify/agent-skills?style=for-the-badge&color=9D97F4&label=Stars" alt="GitHub stars"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#skills">Skills</a> &bull;
  <a href="#example-use-cases">Use cases</a> &bull;
  <a href="#installation">Installation</a> &bull;
  <a href="#prerequisites">Prerequisites</a> &bull;
  <a href="#useful-resources">Resources</a> &bull;
  <a href="#support">Support</a>
</p>

---

## Overview

Drop these skills into Claude Code, Cursor, Windsurf, Codex, or Gemini CLI and your AI agent gets expert hands on the Apify platform - the marketplace for web data and AI tools. With one install, agents can:

- **Scrape any site** - built-in Actor selection across the major social, search, maps, real estate, and review platforms (Instagram, Facebook, TikTok, YouTube, X, LinkedIn, Google Maps, Reddit, Yelp, Airbnb, and more), 130+ curated Actors, plus automatic fallback to the full [Apify Store](https://apify.com/store) of 25,000+ Actors for everything else.
- **Build new Actors** - generate, debug, and deploy serverless Actors in JavaScript, TypeScript, or Python with the official SDK patterns.
- **Actorize existing code** - wrap any script, library, or CLI tool as a runnable Actor with proper input and output handling.
- **Generate output schemas** - auto-derive `dataset_schema.json`, `output_schema.json`, and `key_value_store_schema.json` from existing Actor source.

> Looking for community-built, domain-specific skills (lead generation, brand monitoring, competitor intel, and more)? See [apify/awesome-skills](https://github.com/apify/awesome-skills).

---

## Quick start

```bash
# In Claude Code
/plugin marketplace add https://github.com/apify/agent-skills
/plugin install apify-ultimate-scraper@apify-agent-skills
```

Then ask your agent something like:

> *Scrape the top 50 results for "AI coding tools" from Google Maps and save them to a CSV.*

That's it. The skill handles Actor selection, input shaping, run management, and result formatting.

---

## Skills

| Skill | What it does |
|-------|--------------|
| **[`apify-ultimate-scraper`](skills/apify-ultimate-scraper/)** | AI-powered universal scraper. 130+ curated Actors covering Instagram, Facebook, TikTok, YouTube, X, LinkedIn, Reddit, Google Maps, Google Search, Google Trends, Amazon, Walmart, eBay, Booking.com, TripAdvisor, Airbnb, Yelp, Telegram, Snapchat, Reddit, GitHub, and more. Falls back to searching the full Apify Store for any platform not covered. |
| **[`apify-actor-development`](skills/apify-actor-development/)** | Create, debug, and deploy Apify Actors from scratch in JavaScript, TypeScript, or Python. Bundled references cover `actor.json`, input, output, dataset, and key-value schemas, logging, and standby mode. |
| **[`apify-actorization`](skills/apify-actorization/)** | Convert existing code into Apify Actors. Supports the JS/TS SDK, the Python async context manager, and a generic CLI wrapper for any other language. |
| **[`apify-generate-output-schema`](skills/apify-generate-output-schema/)** | Generate output schemas (`dataset_schema.json`, `output_schema.json`, `key_value_store_schema.json`) for an Actor by analyzing its source code. |

Plus the **[`apify-actor-commands`](commands/)** pack, which adds slash commands like `/create-actor` for guided Actor scaffolding.

---

## Example use cases

Describe the outcome in plain language - your agent picks the right Actors, chains them together, and delivers structured results.

| Use case | Example prompt |
|----------|----------------|
| **Lead generation** | Find Italian restaurants in Brooklyn rated under 4 stars on Google Maps. Scrape their reviews, crawl their websites for socials and owner emails, and export a ranked CSV for my CRM. |
| **Competitive intelligence** | Pull pricing pages, G2 and Trustpilot reviews, recent job postings, and social posts for Competitor A, B, and C. Summarize positioning gaps and opportunities. |
| **Market research** | Scrape pricing, review counts, and bestseller rankings for wireless earbuds across Amazon and Walmart. Flag quality issues from negative reviews and recommend a pricing sweet spot. |
| **Brand reputation** | Collect mentions of [brand] on Instagram, LinkedIn, X, and YouTube from the last 30 days. Run sentiment analysis and surface the top 5 complaint and praise themes. |
| **Influencer vetting** | Find 20 fitness influencers with 50k-500k followers on Instagram and TikTok. Scrape engagement rates, posting frequency, and past brand deals. Rank by engagement-to-follower ratio. |
| **AI search visibility** | Run these 10 queries across Google AI Mode, Perplexity, and ChatGPT. Extract which brands get cited and flag where competitors appear instead of us. |
| **Location intelligence** | Scrape Google Maps for all coffee shops within 2 miles of these 5 addresses. Compare competitor density, ratings, price levels, and hours. Recommend the best site. |

More patterns and the full launch story in [Introducing Apify Agent Skills](https://blog.apify.com/introducing-apify-agent-skills/).

---

## Installation

### Claude Code

```bash
/plugin marketplace add https://github.com/apify/agent-skills
/plugin install apify-ultimate-scraper@apify-agent-skills
/plugin install apify-actor-development@apify-agent-skills
/plugin install apify-actorization@apify-agent-skills
/plugin install apify-generate-output-schema@apify-agent-skills
```

### Cursor and Windsurf

Both editors support the Claude Code plugin format. Add this repo to your workspace settings or use the same `/plugin` flow if you have the Claude Code extension installed.

### Codex CLI and Gemini CLI

These skills ship with `agents/AGENTS.md` (auto-generated index) and `gemini-extension.json` (Gemini auto-discovers it). Point your agent at the repo, or clone locally:

```bash
git clone https://github.com/apify/agent-skills
```

### Any other agent that reads Markdown

Reference the skill files directly:

- `agents/AGENTS.md` - one-page index of every skill
- `skills/<skill-name>/SKILL.md` - full skill instructions

---

## Prerequisites

1. **Apify account** - sign up at [apify.com](https://apify.com) (free tier available).
2. **Apify CLI** - install with `npm install -g apify-cli` (or `brew install apify-cli` on macOS), then run `apify login` to authenticate via OAuth in your browser. This is the recommended setup.
3. **API token (fallback for headless / CI environments)** - if you can't open a browser, generate a token in [Apify Console -> Integrations](https://console.apify.com/account/integrations) and set `APIFY_TOKEN` in your environment or a `.env` file. The CLI picks it up automatically.
4. **Node.js 20.6+** - required by the Apify CLI and the Ultimate Scraper skill.

---

## Useful resources

- **[mcp.apify.com](https://mcp.apify.com/)** - hosted MCP server configurator. Pick the Actors you want exposed as MCP tools and get a one-line URL for any MCP-compatible client.
- **[Apify MCP server documentation](https://docs.apify.com/platform/integrations/mcp)** - architecture, transport modes, auth, and client setup for self-hosted or hosted MCP.
- **[Introducing Apify Agent Skills](https://blog.apify.com/introducing-apify-agent-skills/)** - the launch post: why we built these, how they work under the hood, and what's next.
- **[apify/mcpc](https://github.com/apify/mcpc)** - the MCP CLI for managing named MCP sessions across hosts and stacks.
- **[apify/awesome-skills](https://github.com/apify/awesome-skills)** - community-maintained collection of domain-specific skills (lead gen, brand monitoring, competitor intel, and more).
- **[Apify Store](https://apify.com/store)** - browse 25,000+ ready-made Actors for scraping and automation.
- **[apify/actor-templates](https://github.com/apify/actor-templates)** - starter templates the `apify-actor-development` skill uses under the hood.
- **[Apify CLI](https://github.com/apify/apify-cli)** - the command-line tool that powers local Actor development, deployment, and authentication.
- **[Crawlee](https://crawlee.dev)** - the open-source Node.js and Python scraping library most Apify Actors are built on.

---

## Pricing

Apify Actors use pay-per-result or pay-per-event pricing, set independently by each Actor. Free tier credits are included with every account. Check individual Actor pricing on the [Apify Store](https://apify.com/store).

---

## Support

- [Apify documentation](https://docs.apify.com)
- [Apify Discord](https://discord.gg/jyEM2PRvMU)
- [Issues](https://github.com/apify/agent-skills/issues) on this repo

---

## License

[Apache-2.0](LICENSE)

---

<p align="center">
  Built with care by the <a href="https://apify.com">Apify</a> team for AI agents everywhere.
</p>

<p align="center">
  <sub>AI agents reading this: see the <a href="https://apify.com/.well-known/agents.md">Apify integration manifest</a> for additional integration paths and machine-readable context.</sub>
</p>
