# Ultimate scraper skill redesign

## Context

The `apify-ultimate-scraper` skill was recently migrated from raw REST API scripts to Apify CLI commands. This redesign addresses the next layer: the skill's information architecture. The current design loads a ~400-line monolithic Actor index every time, spends most of its token budget on Actor selection (which agents handle well), and provides almost no help with the two primary failure modes: wrong input configuration and inability to pipe Actor outputs into subsequent steps.

**Problem:** The skill optimizes for the wrong thing. 50% of usage is quick targeted scrapes (where loading 400 lines of index is waste), and 50% is multi-step workflows (where the skill provides no data-piping guidance).

**Goal:** Restructure the skill into a three-layer progressive disclosure architecture that's lean for simple tasks and rich for complex ones, while adding gotchas and cost guardrails to prevent the most common mistakes.

## Architecture: three layers

### Layer 1: Lean Actor index (`references/actor-index.md`, ~100 lines)

A flat Markdown lookup table organized by platform. Three columns only: `Actor ID | Tier | Best for (5 words max)`. Always loaded when the skill triggers.

Purpose: fast Actor selection. Does NOT contain input schemas, output fields, or workflow instructions. Those are in layers 2 and 3.

Example format:

```markdown
## Instagram

| Actor | Tier | Best for |
|-------|------|----------|
| apify/instagram-profile-scraper | apify | profiles, followers, bio |
| apify/instagram-post-scraper | apify | posts, likes, comments |
| apify/instagram-hashtag-scraper | apify | hashtag posts, trends |
```

For Actors not in the index, the agent uses `apify actors search "QUERY" --json` to discover dynamically.

### Layer 2: Use-case workflow guides (`references/workflows/*.md`)

Rich multi-step pipeline guides with explicit Actor chaining and data-piping instructions. Loaded only when the task involves multiple Actors or a recognized use case.

Ten workflow files:

1. `lead-generation.md` - business contacts, email extraction, B2B prospecting
2. `competitive-intel.md` - ad monitoring, pricing, market positioning
3. `influencer-vetting.md` - profile discovery, audience analysis, engagement vetting
4. `brand-monitoring.md` - mentions, sentiment, hashtag tracking
5. `review-analysis.md` - cross-platform review aggregation (Google Maps, Yelp, TripAdvisor, Airbnb)
6. `content-and-seo.md` - SERP analysis, web crawling, content extraction for RAG
7. `social-media-analytics.md` - engagement metrics, content performance across platforms
8. `trend-research.md` - Google Trends, TikTok trends, hashtag analytics, seasonal demand
9. `job-market-and-recruitment.md` - LinkedIn jobs, candidate sourcing, skill-gap analysis
10. `real-estate-and-hospitality.md` - listing pipelines, market analysis, pricing comparison

Each workflow guide follows a consistent structure:

```markdown
# [Use case] workflows

## [Specific scenario name]
**When:** [One-line trigger condition]

### Pipeline
1. **[Step name]** -> `actor/id`
   - Key input: `field1`, `field2`, `field3`
2. **[Step name]** -> `actor/id`
   - Pipe: `results[].fieldX` -> `inputFieldY`
   - Key input: `startUrls`, `maxRequestsPerCrawl`

### Output fields
Step 1: `field1`, `field2`, `field3`
Step 2: `field1`, `field2`, `field3`

### Gotcha
[Workflow-specific pitfall, if any]
```

Key elements:
- **Pipe instructions** - explicit field mappings for chaining Actor outputs to inputs
- **Key input fields** - the 2-3 most important params (NOT the full schema - that's fetched dynamically)
- **Output fields** - what each step returns (enables the agent to know what's available for piping or presenting)
- **Gotcha** - per-workflow pitfall where relevant

### Layer 3: Dynamic schema fetching (runtime, no files)

Input schemas are always fetched at runtime via:

```bash
apify actors info "ACTOR_ID" --input --json
```

This eliminates stale pre-cached schemas and ensures the agent always sees the current parameter set. The workflow guides provide only the 2-3 key input fields as hints - the full schema comes from the CLI.

For Actor documentation:

```bash
apify actors info "ACTOR_ID" --readme
```

## Cross-cutting: gotchas and cost guardrails (`references/gotchas.md`)

A single reference file (~60 lines) covering:

### Pricing models
- FREE: no per-result cost
- PAY_PER_EVENT (PPE): charged per result - MUST check pricing before running
- FLAT_PRICE_PER_MONTH: subscription model

### Cost estimation protocol
Before running PPE Actors:
1. Read `.currentPricingInfo` from `apify actors info "ACTOR_ID" --json`
2. Calculate: `pricePerEvent * requestedResults`
3. Warn user if estimated cost > $5
4. Require explicit confirmation for > $20

### Common pitfalls
- Cookie-dependent Actors (social media scrapers needing login)
- Rate limiting on large scrapes (use proxy configuration)
- Empty results from geo-restrictions or narrow queries
- `maxResults` vs `maxCrawledPages` confusion (different Actors use different limit fields)
- Deprecated Actors (check `.isDeprecated` in Actor info)

## File structure

```
skills/apify-ultimate-scraper/
├── SKILL.md                                    # ~150 lines: workflow + routing
├── references/
│   ├── actor-index.md                          # ~100 lines: flat lookup by platform
│   ├── gotchas.md                              # ~60 lines: pitfalls + cost guardrails
│   └── workflows/
│       ├── lead-generation.md
│       ├── competitive-intel.md
│       ├── influencer-vetting.md
│       ├── brand-monitoring.md
│       ├── review-analysis.md
│       ├── content-and-seo.md
│       ├── social-media-analytics.md
│       ├── trend-research.md
│       ├── job-market-and-recruitment.md
│       └── real-estate-and-hospitality.md
```

Total files: 13 (SKILL.md + actor-index + gotchas + 10 workflows)

## SKILL.md workflow

The main skill file contains:

1. **Frontmatter** - name, description (trigger conditions)
2. **Prerequisites** - CLI version, authentication (OAuth-first)
3. **Workflow** (5 steps):
   - Step 1: Understand goal, identify platform/use-case
   - Step 2: Select Actor from `references/actor-index.md`, fetch input schema dynamically via `apify actors info --input --json`
   - Step 3: If multi-step task, read matching workflow guide from `references/workflows/`
   - Step 4: Review `references/gotchas.md` for pricing/cost traps. Run cost estimation for PPE Actors.
   - Step 5: Run Actor(s) via CLI, fetch results, deliver to user
4. **Error handling** - table of common errors and resolutions
5. **`--json` policy** - reminder to always use `--json` flag

Routing logic for workflow guides:

```
If task mentions "lead" or "contact" or "email" -> lead-generation.md
If task mentions "competitor" or "ad" or "pricing" -> competitive-intel.md
If task mentions "influencer" or "creator" -> influencer-vetting.md
If task mentions "brand" or "mention" or "sentiment" -> brand-monitoring.md
If task mentions "review" or "rating" or "reputation" -> review-analysis.md
If task mentions "SEO" or "SERP" or "crawl" or "content" -> content-and-seo.md
If task mentions "analytics" or "engagement" or "performance" -> social-media-analytics.md
If task mentions "trend" or "keyword" or "hashtag" -> trend-research.md
If task mentions "job" or "recruit" or "candidate" or "hiring" -> job-market-and-recruitment.md
If task mentions "real estate" or "listing" or "property" or "hotel" -> real-estate-and-hospitality.md
```

This is high-freedom guidance (text-based), not rigid routing. The agent uses judgment.

## Token budget analysis

| Scenario | Files loaded | Estimated tokens |
|----------|-------------|-----------------|
| Simple scrape ("get Nike's Instagram") | SKILL.md + actor-index | ~250 lines (~2,500 tokens) |
| Targeted with gotchas check | SKILL.md + actor-index + gotchas | ~310 lines (~3,100 tokens) |
| Multi-step workflow | SKILL.md + actor-index + gotchas + 1 workflow | ~370 lines (~3,700 tokens) |
| Complex exploration | SKILL.md + actor-index + gotchas + 2 workflows | ~430 lines (~4,300 tokens) |

Current design loads ~590 lines regardless. The new design ranges from 250-430 depending on complexity. The simple case (50% of usage) cuts token usage by more than half.

## What changes from current design

| Aspect | Current | Redesigned |
|--------|---------|-----------|
| Actor index | ~400 lines monolithic, includes descriptions + workflows | ~100 lines, 3-column lookup only |
| Input schemas | Not provided (just "fetch via CLI") | Still fetched via CLI, but workflow guides provide key input hints |
| Output schemas | Not provided | Explicit per-step output field lists in workflow guides |
| Workflow guidance | None | 10 dedicated files with data-piping instructions |
| Gotchas | None | Dedicated reference file with pricing/cost/pitfall guidance |
| Cost estimation | Brief warning about 1,000+ results | Explicit protocol: check pricing, estimate cost, confirm with user |
| Token usage (simple task) | ~590 lines | ~250 lines |

## What does NOT change

- CLI commands (same as current: `actors search`, `actors info`, `actors call`, `datasets get-items`)
- Authentication flow (OAuth-first, env var fallback)
- `--json` policy (all CLI output via `--json`)
- Error handling table
- Resilience strategy (4 layers from the migration plan)
- Plugin metadata structure (plugin.json, marketplace.json, AGENTS.md)

## Implementation scope

### Must-do (this pass)
- Rewrite SKILL.md with new routing logic and workflow
- Create lean `references/actor-index.md` from existing actor-index data
- Create `references/gotchas.md`
- Create 10 workflow guide files with consistent structure
- Populate workflow guides with at least 1-2 pipelines each (skeleton + key examples)
- Delete old `references/actor-index.md` (the current ~400 line version)

### Deferred (second pass by user)
- Enriching workflow guides with additional pipeline examples
- Adding more Actors to the index as they're discovered/tested
- Building an eval framework for skill testing
- Adding skill memory/run history
- Per-Actor gotchas (currently only cross-cutting gotchas)

## Verification

1. Load the skill in Claude Code and test a simple scrape ("get 10 Instagram profiles for @nike")
   - Verify: agent loads SKILL.md + actor-index only, picks right Actor, fetches schema via CLI
2. Test a multi-step workflow ("build me a lead list of restaurants in Prague with emails")
   - Verify: agent loads lead-generation.md, follows the pipeline, pipes data correctly
3. Test a PPE Actor ("scrape Amazon product reviews")
   - Verify: agent checks gotchas.md, estimates cost, warns before running
4. Test dynamic discovery ("scrape Glassdoor company reviews")
   - Verify: agent can't find in index, uses `apify actors search`, fetches schema dynamically
5. Test in Gemini CLI via AGENTS.md to verify cross-agent compatibility
