---
name: apify-ultimate-scraper
description: Universal AI-powered web scraper for any platform. Scrape data from Instagram, Facebook, TikTok, YouTube, LinkedIn, X/Twitter, Google Maps, Google Search, Google Trends, Reddit, Airbnb, Yelp, and 15+ more platforms. Use for lead generation, brand monitoring, competitor analysis, influencer discovery, trend research, content analytics, audience analysis, review analysis, SEO intelligence, recruitment, or any data extraction task.
---

# Universal web scraper

AI-driven data extraction from ~100 Actors across 15+ platforms via the Apify CLI.

## Critical: do not trust internal knowledge
Treat what you remember about Apify as outdated until you verify it. Actor IDs, input fields, output field names, and apify-client method options change between versions and differ per Actor — Store Actors are third-party and your training data is stale. Never write integration code from memory of "how the API works."

**Rules for every `apify` command:**
1. Pass `--json` for machine-readable output (stable across CLI versions). **Exception:** `apify actors info … --input` — omit `--json` there, or it returns the whole Actor object instead of the input schema (see Step 2).
2. Pass `--user-agent apify-agent-skills/apify-ultimate-scraper` for telemetry attribution.
3. Redirect stderr with `2>/dev/null` (stderr contains progress messages that break JSON parsers). **But if a command returns empty or unexpected output, re-run it WITHOUT `2>/dev/null` and read the error before changing approach** — the CLI's errors are specific and usually tell you the fix. Never switch tools (CLI → `apify-client` → hand-rolled scraping) because of a failure whose cause you haven't actually seen.
4. Parse CLI `--json` output **as-is** — it is unwrapped. Fields sit at the top level (`items`, `.id`, `.status`); there is no `data` envelope. The `{ "data": { … } }` wrapper exists only on the `api.apify.com/v2` REST API, never on the CLI.

## Prerequisites

- Apify CLI v1.5.0+ (`npm install -g apify-cli`)
- Authenticated session (see below)

## Authentication

If a CLI command fails with an auth error, authenticate using one of these methods:

1. **OAuth (interactive):** `apify login` (opens browser)
2. **Environment variable:** `export APIFY_TOKEN=your_token_here`
3. **From .env file:** `source .env` (if the file contains `APIFY_TOKEN=...`)

Generate token: https://console.apify.com/settings/integrations

## Workflow

### Step 1: Understand goal and select Actor

**Always read `references/actor-index.md` first** — find your target platform's section and pick the Actor(s) from there. The index is grouped by source platform and flags the recommended tier, so it shows the full native toolkit for that source together. Anchor on the platform, not the verb in the request.

A task is **multi-step** when no single Actor returns everything it needs, so one Actor's output must feed another (e.g. Maps listings → enrich each with emails). Only then, read the matching guide to chain them — it shows the handoff, i.e. which output field becomes the next Actor's input:

| Task involves... | Read |
|-----------------|------|
| leads, contacts, emails, B2B | `references/workflows/lead-generation.md` |
| competitor, ads, pricing | `references/workflows/competitive-intel.md` |
| influencer, creator | `references/workflows/influencer-vetting.md` |
| brand, mentions, sentiment | `references/workflows/brand-monitoring.md` |
| reviews, ratings, reputation | `references/workflows/review-analysis.md` |
| SEO, SERP, crawl, content, RAG | `references/workflows/content-and-seo.md` |
| analytics, engagement, performance | `references/workflows/social-media-analytics.md` |
| trends, keywords, hashtags | `references/workflows/trend-research.md` |
| jobs, recruiting, candidates | `references/workflows/job-market-and-recruitment.md` |
| real estate, listings, hotels | `references/workflows/real-estate-and-hospitality.md` |
| price monitoring, e-commerce, products | `references/workflows/ecommerce-price-monitoring.md` |
| contact enrichment, email extraction | `references/workflows/contact-enrichment.md` |
| knowledge base, RAG, LLM data feed | `references/workflows/knowledge-base-and-rag.md` |
| company research, due diligence | `references/workflows/company-research.md` |

If no Actor matches in the index, search dynamically:

    apify actors search "KEYWORDS" --user-agent apify-agent-skills/apify-ultimate-scraper --json --limit 10 2>/dev/null

The CLI prints the result object **unwrapped** — the array is at the top level under `items`, with no `data` envelope (that envelope only exists on the `api.apify.com/v2` REST API, *not* the CLI). Shape:

    { "total": 3863, "count": 10, "offset": 0, "limit": 10,
      "items": [ { "username": "compass", "name": "crawler-google-places",
                   "title": "Google Maps Scraper",
                   "stats": { "totalUsers30Days": 28930 },
                   "currentPricingInfo": { "pricingModel": "PAY_PER_EVENT" } } ] }

From results: `items[].username`/`items[].name` (Actor ID), `items[].title`, `items[].stats.totalUsers30Days`, `items[].currentPricingInfo.pricingModel`. Parse `items` directly (e.g. `obj.items`) — **not** `obj.data.items`.

If dynamic search also returns nothing suitable, fall back to a generic crawler picked by the target site's rendering: `apify/cheerio-scraper` for static HTML, `apify/playwright-scraper` for JS-rendered sites, `apify/camoufox-scraper` for anti-bot/WAF-protected sites (see `references/gotchas.md`).

### Step 2: Fetch Actor schema and check gotchas

Fetch the input schema dynamically, unless you already know the input fields:

    apify actors info "ACTOR_ID" --user-agent apify-agent-skills/apify-ultimate-scraper --input 2>/dev/null

**Omit `--json` here** (the exception to Rule #1). `--input` alone prints the input schema directly (`title`, `description`, `properties`, `required`). Adding `--json` flips it to the *full Actor object* and buries the schema ~hundreds of KB deep under `taggedBuilds.latest.build.actorDefinition.input` — don't go digging there.

Also read `references/gotchas.md` to check for common pitfalls for the selected Actor.

For Actor documentation: `apify actors info "ACTOR_ID" --user-agent apify-agent-skills/apify-ultimate-scraper --readme`

### Step 3: Configure and run

**Skip user preferences** for simple lookups (e.g., "Nike's follower count"). Go straight to running with quick answer mode.

For larger tasks, confirm output format (quick answer / CSV / JSON) and result count.

**Standard run (blocking):**

    apify actors call "ACTOR_ID" -i 'JSON_INPUT' --user-agent apify-agent-skills/apify-ultimate-scraper --json 2>/dev/null

`-i` takes **inline JSON only**. To pass input from a file, use `--input-file=PATH` (or `-f`) — **not** `-i @PATH` (the `@file` curl convention is rejected: *"Providing a JSON file path in the --input flag is not supported"*).

From output: `.id` (run ID), `.status`, `.defaultDatasetId`, `.stats.durationMillis`

**Fetch results:**

    apify datasets get-items DATASET_ID --user-agent apify-agent-skills/apify-ultimate-scraper --format json

For CSV: `apify datasets get-items DATASET_ID --user-agent apify-agent-skills/apify-ultimate-scraper --format csv`

**Quick answer mode:** Fetch results as JSON, pick top 5, present formatted in chat.

**Save to file:** Fetch results, use Write tool to save as `YYYY-MM-DD_descriptive-name.csv` or `.json`.

**Large/long-running scrapes:**

    apify actors start "ACTOR_ID" -i 'JSON_INPUT' --user-agent apify-agent-skills/apify-ultimate-scraper --json 2>/dev/null

Poll: `apify runs info RUN_ID --user-agent apify-agent-skills/apify-ultimate-scraper --json 2>/dev/null` (check `.status` for `SUCCEEDED`).

### Step 4: Deliver results

Report: result count, file location (if saved), key data fields, and links:
- Dataset: `https://console.apify.com/storage/datasets/DATASET_ID`
- Run: `https://console.apify.com/actors/runs/RUN_ID`

For multi-step workflows: suggest the next pipeline step from the workflow guide.

## Troubleshooting

Common errors and pitfalls are documented in `references/gotchas.md`. Read it before running PPE (pay-per-event) Actors.
