---
name: apify-ultimate-scraper
description: Universal AI-powered web scraper for any platform. Scrape data from Instagram, Facebook, TikTok, YouTube, LinkedIn, X/Twitter, Google Maps, Google Search, Google Trends, Reddit, Airbnb, Yelp, and 15+ more platforms. Use for lead generation, brand monitoring, competitor analysis, influencer discovery, trend research, content analytics, audience analysis, review analysis, SEO intelligence, recruitment, or any data extraction task.
---

# Universal web scraper

AI-driven data extraction from ~100 Actors across 15+ platforms via the Apify CLI.

**Rule: Always pass `--json` to CLI commands.** JSON output is stable across CLI versions. Never parse human-readable output.

## Prerequisites

- Apify CLI v1.4.0+ (`npm install -g apify-cli`)
- Authenticated session (see below)

## Authentication

Check: `apify info`

If not logged in, authenticate via OAuth (opens browser):

    apify login

Headless fallback: `export APIFY_TOKEN=your_token_here`
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

    apify actors search "KEYWORDS" --json --limit 10

From results: `items[].username`/`items[].name` (Actor ID), `items[].title`, `items[].stats.totalUsers30Days`, `items[].currentPricingInfo.pricingModel`.

### Step 2: Fetch Actor schema and check gotchas

Fetch the input schema dynamically:

    apify actors info "ACTOR_ID" --input --json

Also read `references/gotchas.md` to check for pricing traps and common pitfalls for the selected Actor.

For PPE Actors: estimate cost before running (see gotchas.md cost estimation protocol).

For Actor documentation: `apify actors info "ACTOR_ID" --readme`

### Step 3: Configure and run

**Skip user preferences** for simple lookups (e.g., "Nike's follower count"). Go straight to running with quick answer mode.

For larger tasks, confirm output format (quick answer / CSV / JSON) and result count.

**Standard run (blocking):**

    apify actors call "ACTOR_ID" -i 'JSON_INPUT' --json

From output: `.id` (run ID), `.status`, `.defaultDatasetId`, `.stats.durationMillis`

**Fetch results:**

    apify datasets get-items DATASET_ID --format json

For CSV: `apify datasets get-items DATASET_ID --format csv`

**Quick answer mode:** Fetch results as JSON, pick top 5, present formatted in chat.

**Save to file:** Fetch results, use Write tool to save as `YYYY-MM-DD_descriptive-name.csv` or `.json`.

**Large/long-running scrapes:**

    apify actors start "ACTOR_ID" -i 'JSON_INPUT' --json

Poll: `apify runs info RUN_ID --json` (check `.status` for `SUCCEEDED`).

### Step 4: Deliver results

Report: result count, file location (if saved), key data fields, and links:
- Dataset: `https://console.apify.com/storage/datasets/DATASET_ID`
- Run: `https://console.apify.com/actors/runs/RUN_ID`

For multi-step workflows: suggest the next pipeline step from the workflow guide.

## Troubleshooting

Common errors and pitfalls are documented in `references/gotchas.md`. Read it before running PPE (pay-per-event) Actors.
