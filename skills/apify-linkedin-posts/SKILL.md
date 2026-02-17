---
name: apify-linkedin-posts
description: Scrape a LinkedIn profile's recent posts and generate a validated HTML report. Supports single profiles and batch requests with concurrent agent execution. Use when user provides a LinkedIn profile URL and wants post analysis.
---

# LinkedIn Posts Report

Scrape LinkedIn profile posts and generate a validated HTML report with posting patterns, content themes, and engagement analysis. Supports single profiles and batch requests.

## Prerequisites
(No need to check it upfront)

- `.env` file with `APIFY_TOKEN`
- Node.js 20.6+ (for native `--env-file` support)
- `mcpc` CLI tool: `npm install -g @apify/mcpc`

### Apify MCP Connection Check

Before starting, verify the Apify connection is working:

```bash
export $(grep APIFY_TOKEN .env | xargs) && mcpc --json mcp.apify.com --header "Authorization: Bearer $APIFY_TOKEN" tools-call search-actors keywords:="test" limit:=1 offset:=0 category:="" 2>&1 | head -5
```

**If connection fails:**
1. Direct the user to `https://mcp.apify.com` to authenticate
2. If they don't have an Apify account, direct them to `https://console.apify.com/sign-in`
3. If they're unfamiliar with MCP, explain: "MCP (Model Context Protocol) is how AI tools connect to external services like Apify. The Apify MCP server lets your AI assistant call Apify Actors directly to scrape data."
4. For detailed setup: `https://docs.apify.com/platform/integrations/mcp`

Do NOT proceed until the connection is confirmed working.

## Workflow

Copy this checklist and track progress:

```
Task Progress:
- [ ] Step 0: Verify Apify connection and estimate cost
- [ ] Step 1: Validate input (LinkedIn profile URL or username)
- [ ] Step 2: Scrape posts and profile details
- [ ] Step 3: Filter to last 3 months
- [ ] Step 4: Validate via Apify Actors
- [ ] Step 5: Anti-hallucination verification
- [ ] Step 6: Confidence assessment
- [ ] Step 7: Generate HTML report
- [ ] Step 8: Report actual cost
```

### Step 0: Cost Estimation

Before scraping, estimate and display the cost to the user:

**Apify Actor Costs (approximate):**
- `apimaestro/linkedin-profile-posts` — ~$0.05-0.10 per profile
- `apimaestro/linkedin-profile-detail` — ~$0.01-0.02 per profile
- Total per profile: ~$0.06-0.12

**Display format:**
```
Cost Estimate:
- {N} profiles x ~$0.10/profile = ~${estimated_cost} (Apify usage)
- Actors: apimaestro/linkedin-profile-posts, apimaestro/linkedin-profile-detail
- Proceed? (Y/n)
```

For single profiles or small batches (<=5), display the estimate inline.
For batches >5, wait for user confirmation before proceeding.

### Step 1: Validate Input

Extract the LinkedIn username(s) from the input. Accept any of these formats:

**Single profile:**
- Full URL: `https://www.linkedin.com/in/username/`
- URL with locale: `https://www.linkedin.com/in/username/?locale=en_US`
- Just the username: `username`

**Batch (comma-separated):**
- `username1, username2, username3`
- `https://www.linkedin.com/in/username1/, username2, username3`

Strip trailing slashes and query parameters to isolate each username.

**Detect mode:**
- 1 profile -> Single mode
- 2+ profiles -> Batch mode

### Step 2: Scrape Data

#### Single Profile

Run these two scrapers **in parallel** using `call-actor`:

> **Important:** Actor-specific tools (e.g., `apimaestro/linkedin-profile-posts`) are NOT available as direct `tools-call` targets. You must use the generic `call-actor` tool with `actor:=` and `input:='{...}'` parameters. Using `tools-call apimaestro/linkedin-profile-posts ...` directly will fail with "Tool not found."

1. **Profile Posts** via mcpc:
```bash
export $(grep APIFY_TOKEN .env | xargs) && mcpc --json mcp.apify.com --header "Authorization: Bearer $APIFY_TOKEN" tools-call call-actor actor:="apimaestro/linkedin-profile-posts" input:='{"username":"USERNAME","limit":100,"page_number":1}' 2>&1 | jq -r '.content[0].text'
```

2. **Profile Details** via mcpc:
```bash
export $(grep APIFY_TOKEN .env | xargs) && mcpc --json mcp.apify.com --header "Authorization: Bearer $APIFY_TOKEN" tools-call call-actor actor:="apimaestro/linkedin-profile-detail" input:='{"username":"USERNAME"}' 2>&1 | jq -r '.content[0].text'
```

Alternatively, use `run_actor.js`:
```bash
node --env-file=.env ${CLAUDE_PLUGIN_ROOT}/reference/scripts/run_actor.js \
  --actor "apimaestro/linkedin-profile-posts" \
  --input '{"username": "USERNAME", "limit": 100, "page_number": 1}' \
  --output YYYY-MM-DD_USERNAME_posts.json \
  --format json
```

> **Parsing mcpc output:** The `jq -r '.content[0].text'` output from mcpc is often wrapped in markdown code fences (`` ```json ... ``` ``). Before parsing with `jq`, strip the first and last lines: `sed '1d;$d'`. For example:
> ```bash
> ... | jq -r '.content[0].text' | sed '1d;$d' | jq '.[]'
> ```

> **Incomplete preview from `call-actor`:** The `call-actor` response includes only a **preview** of the dataset (e.g., 15 of 20 items). Check `structuredContent.itemCount` for the true total. If the preview is incomplete, fetch the remaining items using `get-actor-output` with `offset` and `limit`:
> ```bash
> export $(grep APIFY_TOKEN .env | xargs) && mcpc --json mcp.apify.com --header "Authorization: Bearer $APIFY_TOKEN" tools-call get-actor-output datasetId:="DATASET_ID" limit:=10 offset:=15 2>&1 | jq -r '.content[0].text'
> ```
> The `datasetId` is available in the `call-actor` response under `structuredContent.datasetId`.

If the posts scraper returns fewer items than the total, fetch remaining pages by incrementing `page_number`.

#### Batch Execution (2+ profiles)

Use concurrent execution for parallel scraping. Recommended batch sizing:

| Total Profiles | Profiles per Batch | Concurrent Batches |
|---|---|---|
| 2-5 | All in 1 batch | 1 |
| 6-10 | 5 per batch | 2 |
| 11-25 | 5 per batch | 3-5 |
| 26-50 | 5 per batch | 6-10 |
| 51-100 | 5 per batch | 11-20 |

**Why 5 per batch:** Each profile generates ~25K tokens of scraped data. At 5 profiles/batch, context stays manageable (~130K tokens).

For Claude Code with MCP: Use `Task` agents with `subagent_type: "general-purpose"`, each scraping 5 profiles. Run all agents in parallel.

For CLI/mcpc: Fire multiple `run_actor.js` processes simultaneously.

**CRITICAL — Data Integrity:** When assembling reports from batch results, use ONLY actual scraped data. Never fabricate, estimate, or use placeholder values for any URLs, dates, content, or metadata. If a batch failed to return data for a profile, mark it as "Data unavailable" rather than generating fake data.

### Step 3: Filter to Last 3 Months

- Calculate the date 3 months before today
- Include only posts with `posted_at.date` within that window
- Keep all post types (original, quote, repost)
- Note any significant posting gaps (>3 weeks)

> **Reshared post data:** Posts with `post_type` of `"quote"` or `"repost"` contain a nested `reshared_post` object with its own `text`, `posted_at`, `stats`, `url`, and `author` fields. When parsing or filtering posts, be careful to use only the **top-level** fields for the post itself — the nested `reshared_post` data belongs to the original author's post being quoted/reposted. Do not double-count dates, stats, or text from nested reshared posts.

### Step 4: Validate via Apify Actors

Use Apify Actors for validation instead of raw web requests, since LinkedIn blocks unauthenticated access.

**Preferred validation Actors:**
1. **`apify/cheerio-scraper`** (FREE) — lightweight HTML validation
2. **`apify/puppeteer-scraper`** (FREE) — JS-rendered page validation
3. **`apify/website-content-crawler`** — structured content extraction

All validation calls go through mcpc `call-actor` or MCP tools. Never use direct HTTP requests to LinkedIn.

**Validation process:**

Spot-check posts per profile (scale for batch):
- Single profile: 2 posts
- Batch 2-10: 2 posts from 2-3 random profiles
- Batch 11-50: 2 posts from 3-5 random profiles

For each validation:
1. Use an Apify scraper to fetch the post's LinkedIn URL
2. Compare: author name, post content snippet, date, engagement stats
3. Flag any discrepancies

Also verify profile details (name, headline, company) match between the posts scraper and profile details scraper.

**Fallback:** If Apify validation Actors are unavailable, fall back to direct web fetch. If that hits a LinkedIn login wall (999 status), note as "inconclusive" — this is expected and does NOT mean the data is wrong.

### Step 5: Anti-Hallucination Verification (CRITICAL — DO NOT SKIP)

Before generating any report, perform these checks on ALL scraped data:

**URL Verification:**
- Every post URL must follow the LinkedIn activity URL pattern: `https://www.linkedin.com/feed/update/urn:li:activity:{19-digit-ID}`
- Reject any URL containing placeholder patterns (`1234567890`, `0000000000`, `#`, `example.com`)
- Reject any URL where the activity ID is not a unique 19-digit number

**Username Verification:**
- Every profile's scraped username must exactly match the requested username
- If the scraper returns a different username (e.g., redirected profile), flag it: `[WARNING] Requested '{requested}' but scraper returned '{actual}'.`

**Date Verification:**
- All post dates must be within a plausible range (not in the future, not older than the account)
- Dates should be consistent with the requested 3-month window
- If multiple posts share the exact same timestamp, flag as suspicious

**Content Verification:**
- Post content should not contain obvious template/placeholder text
- Post types (Original/Quote/Repost) should match the content structure (a "Repost" should reference another author)
- If >50% of posts have identical or near-identical content, flag as suspicious

**If verification fails:** Do NOT generate the report with bad data. Re-scrape the affected profiles. If re-scraping returns the same suspicious data, include it with explicit warnings.

### Step 6: Confidence Assessment

After scraping and verification, calculate and display confidence BEFORE generating the report.

**Confidence Levels:**

| Request Size | Expected Data Quality | Confidence |
|---|---|---|
| 1-5 profiles | ~95% profiles return data | HIGH |
| 6-20 profiles | ~90% profiles return data | HIGH |
| 21-50 profiles | ~85-90% profiles return data | MEDIUM |
| 51-100 profiles | ~80-85% profiles return data | MEDIUM-LOW |

**Always indicate when confidence wanes.** For batches >20 profiles, explicitly state that confidence is MEDIUM and recommend spot-checking a 10% sample.

**Status table (for batch requests):**
```
Profile Results Summary:
| # | Profile         | Posts Found | Status          |
|---|-----------------|-------------|-----------------|
| 1 | username1       | 15          | OK              |
| 2 | username2       | 8           | OK              |
| 3 | username3       | 0           | Private/inactive|

Overall: 2/3 profiles returned data (67%)
Confidence: MEDIUM — some profiles had limited visibility
```

### Step 7: Generate HTML Report

**Output location:**
- Single profile: `/tmp/YYYY-MM-DD_USERNAME_linkedin_posts.html`
- Batch: `/tmp/YYYY-MM-DD_batch_{N}_linkedin_posts.html`

**Report structure:**

1. **Confidence Banner** (top of report, for batch)
   - GREEN (`#e6f4ea`): All profiles returned data, validation passed
   - YELLOW (`#fef3e0`): Some profiles had limited data or validation inconclusive
   - RED (`#fce8e6`): Significant data gaps or verification failures

2. **Header Section**
   - Full name, headline, location
   - About/bio summary (italic, left-bordered)
   - Meta stats: follower count, connection count, report period, post count

3. **Posts Table**
   - Columns: #, Date, Post URL, Content, Type
   - Date: formatted as `Mon DD, YYYY`
   - Post URL: clickable "View post" link — MUST use the real scraped URL, never a placeholder
   - Content: `.own-text` (bold) + `.context` (gray, smaller)
   - Type: Color-coded badge — Original (green), Quote (blue), Repost (orange)

4. **Validation Summary Section**
   - Bullet list of what was verified
   - Posting pattern analysis: ratio of original vs quote/repost, key themes, posting gaps

5. **Footer**
   - "Generated on {date} via Apify MCP + Claude Code"

**Styling:**
- Background: `#f3f2ef` (LinkedIn-like)
- Cards: `#fff`, `border-radius: 12px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`
- Table header: `#1b1f23` background, white text
- Font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Max width: `960px`, centered

### Step 8: Cost Report

After all scraping and analysis is complete, fetch the **actual cost** of every Actor run using the `get-actor-run` MCP tool. Do NOT rely on estimates — always retrieve real billing data.

**For each Actor run performed during the analysis**, call:

```bash
export $(grep APIFY_TOKEN .env | xargs) && mcpc --json "mcp.apify.com/?tools=get-actor-run" --header "Authorization: Bearer $APIFY_TOKEN" tools-call get-actor-run runId:="RUN_ID" 2>&1 | jq -r '.content[0].text'
```

> **Important:** Use the `?tools=get-actor-run` query parameter in the MCP URL to ensure the `get-actor-run` tool is loaded. Without it, the tool may not be available.

Extract the `usageTotalUsd` field from each run response. If multiple runs were performed (e.g., posts scraper + profile detail + validation), fetch all of them and sum the costs.

**Display the actual cost summary:**

```
Actual Cost Summary:
| # | Actor                                      | Run ID              | Duration | Cost (USD) |
|---|--------------------------------------------|---------------------|----------|------------|
| 1 | apimaestro/linkedin-profile-posts           | {run_id_1}          | {Xs}     | ${cost_1}  |
| 2 | apimaestro/linkedin-profile-detail          | {run_id_2}          | {Xs}     | ${cost_2}  |
| 3 | apify/cheerio-scraper (validation)          | {run_id_3}          | {Xs}     | ${cost_3}  |
|   | **Total**                                   |                     |          | **${sum}** |

Profiles processed: {success}/{total_requested}
```

**Important:** Track all run IDs as they are created during Steps 2 and 4. The `run_actor.js` script returns the run ID in its output — capture these for the final cost report.

> **Note:** `mcpc call-actor` does **not** expose the run ID in its output. If you used `call-actor` via mcpc and need the run ID for cost reporting, use the Apify REST API to list recent runs for that Actor:
> ```bash
> export $(grep APIFY_TOKEN .env | xargs) && curl -s "https://api.apify.com/v2/acts/ACTOR_ID/runs?token=$APIFY_TOKEN&limit=5&desc=true" | jq '.data.items[] | {id, startedAt, finishedAt, status, usageTotalUsd}'
> ```
> Replace `ACTOR_ID` with the Actor's namespaced ID using `~` instead of `/` (e.g., `apimaestro~linkedin-profile-posts`). Filter by `startedAt` timestamp to match your runs.

---

## Error Handling

`APIFY_TOKEN not found` - Ask user to create `.env` with `APIFY_TOKEN=your_token`
`mcpc not found` - Ask user to install `npm install -g @apify/mcpc`
`Actor not found` - Check Actor ID spelling
`0 posts returned` - Profile may be private or username incorrect. Do NOT retry.
`Validation blocked (login wall)` - Note as "inconclusive". Scraped data is from Apify's authenticated proxy and is likely accurate.
`Profile detail scraper fails` - Proceed with posts data only, note limited validation.
`Anti-hallucination check fails` - Re-scrape affected profiles. If issue persists, include with explicit warnings.
`Agent fails in batch mode` - Report which agent failed, include data from successful agents, offer to re-scrape.
`Apify MCP disconnected mid-run` - Stop processing, save partial results, direct user to `https://mcp.apify.com` to re-authenticate.

---

## Guidelines

### Always Use Apify Actors
- All scraping, validation, and data retrieval must go through Apify Actors (via mcpc or MCP tools). No direct HTTP requests to LinkedIn.
- Preferred validation Actors: `apify/cheerio-scraper`, `apify/puppeteer-scraper`, `apify/website-content-crawler`.

### Batch Execution Best Practices
- Use concurrent execution for batch requests — 5 profiles per batch is the validated sweet spot (~130K tokens/batch, ~4-5 min execution).
- Always run both scrapers (posts + profile details) in parallel within each batch.
- Show progress after each batch completes.

### Anti-Hallucination (Critical)
- Never fabricate URLs, dates, content, or metadata — only report what the scraper actually returns.
- Double-check every post URL — must be a real LinkedIn activity URL with a unique 19-digit ID. Reject placeholder patterns.
- Verify usernames match — scraped data must correspond to the requested profile.
- Post types must match content — an "Original" post should not reference another author's content.

### Confidence & Cost Transparency
- Always estimate cost before scraping and display upfront. Get confirmation for large batches.
- Always report actual cost at the end of every run.
- Always indicate when confidence wanes — explicitly state MEDIUM for batches >20 profiles.
- Be honest about limitations — some profiles will be private or inactive. This is a LinkedIn platform limitation, not an error.

### Apify MCP Setup
- If the user is not connected to Apify, take them to `https://mcp.apify.com` to authenticate.
- If they don't know what MCP is, explain it and walk them through setup step by step.
- Detailed setup docs: `https://docs.apify.com/platform/integrations/mcp`
