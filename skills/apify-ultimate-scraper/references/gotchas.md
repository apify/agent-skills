# Gotchas and cost guardrails

## Pricing models

| Model | How it works | Action before running |
|-------|-------------|----------------------|
| FREE | No per-result cost, only platform compute | None needed |
| PAY_PER_EVENT (PPE) | Charged per named event, including paid options | MUST estimate cost first |
| FLAT_PRICE_PER_MONTH | Monthly subscription | Verify user has active subscription |

To check an Actor's pricing:

    apify actors info "ACTOR_ID" --user-agent apify-agent-skills/apify-ultimate-scraper --json

Read the currently effective entry in `.pricingInfos` (Store search uses `.currentPricingInfo`). PPE prices are under `.pricingPerEvent.actorChargeEvents`: `.eventPriceUsd` for flat events, or `.eventTieredPricingUsd[TIER].tieredEventPriceUsd` for tiered events.

## Cost estimation protocol

Before running any PPE Actor:

1. Read applicable event prices from Actor info, including paid options.
2. Estimate cost using expected event counts.
3. Present the estimate to the user with this disclaimer:

> **Estimated cost: ~$X for Y results.** This is a rough estimate only - actual costs can vary significantly depending on the Actor, data complexity, retries, and platform changes. Always check your Apify billing dashboard for actual charges.

4. If estimate > $5: warn explicitly
5. If estimate > $20: require explicit user confirmation before proceeding

**Important:** Cost estimates in the workflow guides are approximate and may be inaccurate. Always present them as rough guidance with the disclaimer above, never as exact amounts.

## Common pitfalls

**Cookie-dependent Actors**
Some social media scrapers require cookies or login sessions. If an Actor returns auth errors or empty results unexpectedly, check its README:

    apify actors info "ACTOR_ID" --user-agent apify-agent-skills/apify-ultimate-scraper --readme

Look for mentions of "cookies", "login", "session", or "proxy".

**Input mechanics**
Actor input is one JSON object, not an array. `--input` accepts inline JSON object input only; wrap inline JSON in quotes to avoid shell parsing issues. For JSON files or complex inputs, use `--input-file input.json`. If the CLI reports parse, path, or object-shape input errors, inspect the schema again with `apify actors info "ACTOR_ID" --user-agent apify-agent-skills/apify-ultimate-scraper --input`.

    apify actors call "ACTOR_ID" --input '{"maxItems":10}' --user-agent apify-agent-skills/apify-ultimate-scraper --json

Prefer this for larger inputs:

    apify actors call "ACTOR_ID" --input-file input.json --user-agent apify-agent-skills/apify-ultimate-scraper --json

**Rate limiting on large scrapes**
Platforms throttle or block large-volume scraping. Mitigations:
- Use proxy configuration when available: `"proxyConfiguration": {"useApifyProxy": true}`
- Set reasonable concurrency limits (check the Actor's `maxConcurrency` input)
- For 1,000+ results, suggest splitting into smaller batches

**Empty results**
Common causes:
- Too-narrow search query or geo-restriction (try broader terms)
- Platform blocking without proxy (enable Apify Proxy)
- Actor requires cookies/login but none provided
- Wrong input field name (always verify with `--input --json`)

**maxResults vs maxCrawledPages**
Different Actors use different limit field names. Common variants:
- `maxResults`, `resultsLimit`, `maxItems` - limit output items
- `maxCrawledPages`, `maxRequestsPerCrawl` - limit pages visited
Always fetch the input schema to find the correct field for the specific Actor.

**Deprecated Actors**
Check `.isDeprecated` in `apify actors info "ACTOR_ID" --user-agent apify-agent-skills/apify-ultimate-scraper --json`. If `true`:
1. Search for alternatives: `apify actors search "SIMILAR_KEYWORDS" --user-agent apify-agent-skills/apify-ultimate-scraper --json`
2. Prefer `apify` tier replacements over `community` alternatives

**LinkedIn pricing**
LinkedIn Actors are all PPE and vary significantly:
- `harvestapi/` Actors: generally cheaper ($0.001-0.01/result)
- `apimaestro/` Actors: generally more expensive ($0.005-0.02/result)
- `dev_fusion/` Actors: mid-range, useful for mass scraping with email enrichment
Always compare pricing before selecting a LinkedIn Actor.

**SEO tool pricing**
`radeance/` SEO scrapers (SimilarWeb, Ahrefs, SEMrush, Moz) have the highest per-result costs ($0.005-0.0275/result). For large-scale SEO analysis, estimate costs carefully and suggest batching.

## Error recovery

### Actor permission approval

`full-permission-actor-not-approved` means the user must approve that Actor once in the Apify account used by the run.

- Preserve the API's `.error.data.approvalUrl` or the CLI's `Approve here:` link in the user-facing response, even if a fallback succeeds. Identify the blocked Actor and workflow step.
- Explain that full permissions grant access to the whole account. Ask the user to review the permissions at the supplied Console link and approve using **Start** or **three-dot menu > Approve Actor permissions**, then retry the blocked step.
- If a fallback is used, disclose which Actor replaced the blocked one, what it completed and any remaining gaps.

See [Apify's permission documentation](https://docs.apify.com/actors/running/permissions).

### Other run errors

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `status: FAILED` in run output | Actor crashed or input invalid | Read `.statusMessage` in JSON; check run log at `https://console.apify.com/actors/runs/RUN_ID/log` |
| `isDeprecated: true` in Actor info | Actor is end-of-life | Search for replacement: `apify actors search "KEYWORDS" --user-agent apify-agent-skills/apify-ultimate-scraper --json` |
| Empty dataset (0 items) | Query too narrow, geo-restriction, or anti-bot block | Broaden search terms; enable Apify Proxy; check Actor README with `apify actors info ACTOR_ID --user-agent apify-agent-skills/apify-ultimate-scraper --readme` |
| Run takes >10 minutes | Large scrape or slow target site | Switch to fire-and-forget: `apify actors start --user-agent apify-agent-skills/apify-ultimate-scraper --json`, poll with `apify runs info RUN_ID --user-agent apify-agent-skills/apify-ultimate-scraper --json` |

## Why Apify Actors vs raw HTTP scraping

Many n8n and automation workflows use raw HTTP Request nodes or self-hosted Puppeteer for web scraping. These hit common walls that Apify Actors handle transparently:

**Cloudflare and WAF bypass**
Raw HTTP requests fail on sites with Cloudflare Turnstile, DataDome, or other WAFs. Apify Actors use residential proxies and browser fingerprint rotation automatically. For the toughest sites, use `apify/camoufox-scraper`.

**JavaScript-rendered pages (SPAs)**
React, Vue, and Angular sites return empty HTML to plain HTTP requests. Apify's `apify/playwright-scraper` and `apify/camoufox-scraper` fully render JavaScript before extracting data.

**Anti-bot fingerprinting**
Even headless browsers get detected via TLS fingerprints (JA3 hashes). Apify's browser pool rotates fingerprints across requests automatically.

**Session and cookie management**
Social media platforms (LinkedIn, Instagram) require persistent sessions. Social media Actors handle cookie management and session rotation internally.

**Scaling without infrastructure**
Self-hosted Puppeteer at scale requires 4-8 GB RAM per browser instance. Apify Actors run on serverless infrastructure - no browser pool management, no RAM provisioning, no Docker orchestration.

## Platform-specific rate limits

**Instagram:** Aggressive rate limiting. Keep `maxResults` under 200 per run for profile/post scrapers. Use delays between runs. Instagram API scrapers (`apify/instagram-api-scraper`) have higher limits than browser-based ones.

**LinkedIn:** All LinkedIn Actors are community-maintained and PPE. LinkedIn actively blocks scraping at scale. Keep batch sizes under 100 profiles. Space runs at least 5 minutes apart. Expect occasional empty results.

**TikTok:** Anti-bot measures increasing. `clockworks/tiktok-scraper` handles most cases. For blocked regions, enable Apify Proxy with residential IPs.

**Google Maps:** Set `language: "en"` explicitly for consistent results and use specific locations or search areas. Before ranking businesses or comparing locations:

- Validate returned primary/secondary categories or official descriptions against the requested business type, including cafes listed as bakeries or restaurants. Exclude unrelated businesses from competitor counts and recommendations.
- Check requested geography and rating conditions on the returned records, and deduplicate by place ID within each location. For radius searches, verify distance from the intended address; overlapping locations may legitimately share shops.
- If supported by the current schema, `categoryFilterWords` can narrow results, but it is a paid filter and can exclude miscategorized businesses. Include its cost and still validate the returned sample.
- Inspect coverage of requested price levels and hours. Listing-only extraction may leave these null; check detail-extraction options before declaring that the source has no data. Keep unknowns explicit and identify which comparisons remain unsupported.
- Treat capped search results as a sample. Support density comparisons with evidence of comparable coverage, and disclose sampling limits when recommending a site.

**Amazon/E-commerce:** Heavy anti-bot. The `apify/e-commerce-scraping-tool` handles this via built-in proxy rotation. Raw HTTP requests will fail.
