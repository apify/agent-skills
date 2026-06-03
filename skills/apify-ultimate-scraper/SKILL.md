---
name: apify-ultimate-scraper
description: >-
  This skill should be used when the user asks to "scrape Instagram", "scrape TikTok", "scrape
  YouTube", "scrape LinkedIn", "scrape Reddit", "scrape Google Maps", "extract data from social
  media", "get reviews from", "scrape a website", or wants to extract structured data from 15+
  platforms (Instagram, Facebook, TikTok, YouTube, LinkedIn, X, Google Maps, Reddit, Airbnb,
  Yelp) for lead generation, competitor analysis, or trend research.
---

# Universal web scraper

AI-driven data extraction from ~100 Actors across 15+ platforms via the Apify CLI.

**Rules for every `apify` command:**
1. Pass `--json` for machine-readable output (stable across CLI versions).
2. Pass `--user-agent apify-agent-skills/apify-ultimate-scraper` for telemetry attribution.
3. Redirect stderr with `2>/dev/null` (stderr contains progress messages that break JSON parsers).

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

Identify the target platform and use case. Read `references/actor-index.md` to find the right Actor.

If the task involves a multi-step pipeline, also read the matching workflow guide:

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

From results: `items[].username`/`items[].name` (Actor ID), `items[].title`, `items[].stats.totalUsers30Days`, `items[].currentPricingInfo.pricingModel`.

### Step 2: Fetch Actor schema and check gotchas

Fetch the input schema dynamically:

    apify actors info "ACTOR_ID" --user-agent apify-agent-skills/apify-ultimate-scraper --input --json 2>/dev/null

Also read `references/gotchas.md` to check for common pitfalls for the selected Actor.

For Actor documentation: `apify actors info "ACTOR_ID" --user-agent apify-agent-skills/apify-ultimate-scraper --readme`

### Step 3: Configure and run

**Skip user preferences** for simple lookups (e.g., "Nike's follower count"). Go straight to running with quick answer mode.

For larger tasks, confirm output format (quick answer / CSV / JSON) and result count.

**Standard run (blocking):**

    apify actors call "ACTOR_ID" -i 'JSON_INPUT' --user-agent apify-agent-skills/apify-ultimate-scraper --json 2>/dev/null

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
