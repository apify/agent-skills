---
name: apify-linkedin-posts
description: Scrape a LinkedIn profile's recent posts and generate a validated HTML table of post URLs, content, and engagement. Uses Apify ecosystem only (mcpc CLI primary, Apify MCP fallback). Supports single profiles and batch requests with parallel execution.
---

# LinkedIn Posts Report

Scrape a LinkedIn profile's recent posts and generate a validated HTML table of post URLs and content.

## Your Task

Generate a LinkedIn posts report for: $ARGUMENTS

If no URL or username is provided, ask the user for one or more LinkedIn profile URLs or usernames.

## Scope — What This Skill Does and Does NOT Do

**This skill produces ONE thing:** an HTML file containing a table with these columns:
1. **Post URL** — clickable link to the LinkedIn post
2. **Content** — the text content of that post
3. **Engagement** — likes, comments, and reposts

For all posts from the **last 3 months** (calculated as today minus 90 days). That's it.

**This skill does NOT:**
- Analyze posting patterns, themes, or engagement trends
- Calculate confidence scores or risk assessments
- Generate profile summaries, bios, or follower analytics
- Add type badges, content categorization, or pattern detection
- Produce anything beyond the validated HTML table

If you find yourself building something not listed above, **STOP — you are out of scope.**

## Processing Constraints (DO NOT VIOLATE)

### Allowed tools — Apify ecosystem ONLY
- **`mcpc`** (Apify MCP CLI) — primary tool for scraping, data retrieval, and validation
- **Apify MCP server** (via ToolSearch/MCP tools) — fallback if mcpc is unavailable or broken
- **`python3 << 'EOF'` inline commands** via Bash — for filtering data and generating HTML
- **`Write` tool** — for small single-profile reports only
- **`open`** — to launch the report in browser

**All data must come from Apify.** Do NOT use any non-Apify scraping tools, APIs, web fetchers, or data sources. No `curl` to third-party APIs, no `WebFetch` to LinkedIn directly, no alternative scraping libraries. If Apify cannot provide the data, report that to the user — do not find another way.

### Explicitly prohibited
- Do NOT use any scraping or data tool outside the Apify ecosystem
- Do NOT create `.py`, `.js`, `.sh`, or any script files
- Do NOT create intermediate data files (JSON, CSV, temp files, etc.)
- Do NOT launch `Task` agents for anything other than scraping (batch mode only)
- Do NOT add features, analysis, or sections not described in this skill
- Do NOT retry failed profiles more than once
- If stuck, **STOP and ask the user** — do not improvise

### Data flow (Apify ecosystem only)
1. **Scrape:** mcpc or Apify MCP → `apimaestro/linkedin-profile-posts` → get `datasetId`
2. **Process:** mcpc or Apify MCP → `get-actor-output` → filter to 3 months → validate → generate HTML — all in **one inline command**
3. **Validate:** mcpc or Apify MCP → spot-check via Apify scraper actors
4. **Deliver:** Open HTML in browser

**Tool priority:** mcpc first. If mcpc fails → fall back to Apify MCP server tools. Never use non-Apify tools.

## Input Parsing

Extract LinkedIn username(s) from the input. Accept:
- Full URL: `https://www.linkedin.com/in/username/`
- URL with params: `https://www.linkedin.com/in/username/?locale=en_US`
- Just username: `username`
- Comma-separated batch: `username1, username2, username3`

Strip trailing slashes and query parameters. Detect mode: 1 profile = single, 2+ = batch.

## Step 0: Prerequisites

### mcpc CLI (Primary Tool)

`mcpc` is the primary tool for this entire skill — scraping, data retrieval, and validation all go through it.

1. Check: `which mcpc && mcpc --version`
2. If missing, ask the user which install method they prefer:
   - **Local install (recommended, faster):** `npm install @apify/mcpc` in the working directory, then use `./node_modules/.bin/mcpc` for all commands. This avoids `npx` package resolution overhead (~2-3s per call).
   - **npx (no install):** Use `npx @apify/mcpc` for all commands. Slower but requires no setup.
   - **Global install:** `npm install -g @apify/mcpc` then use `mcpc` directly. May fail with permission errors.
3. Set the `MCPC` variable for use in Step 2's python script:
   - Local: `MCPC="./node_modules/.bin/mcpc"`
   - npx: `MCPC="npx @apify/mcpc"` (note: python subprocess needs `shell=True` or split args)
   - Global: `MCPC="mcpc"`
4. Check session: `{MCPC}` (look for `@apify` 🟢)
5. If no session: `{MCPC} mcp.apify.com connect @apify`
6. If auth required: `{MCPC} mcp.apify.com login` → browser OAuth → then retry step 5
7. Verify session works:
   ```bash
   {MCPC} @apify tools-call search-actors keywords:=test limit:=1 offset:=0 category:="" --json | head -5
   ```
8. If verification fails → run `open https://mcp.apify.com` and walk user through OAuth authentication, then retry

**Display status:**
```
mcpc CLI: Installed (vX.X.X) — local | npx | global
Session @apify: Connected (🟢 live)
```

Do NOT proceed until mcpc is confirmed working.

### Fallback: Apify MCP Server (if mcpc fails)

If mcpc cannot be installed, authenticated, or is otherwise broken:

1. Use `ToolSearch` to find Apify MCP tools (search for `apify`)
2. Use the Apify MCP server tools directly: `mcp__apify__call-actor`, `mcp__apify__get-actor-output`, etc.
3. **Important limitation:** Apify MCP tool results >25KB overflow to temp files. For data retrieval (Step 2), you must:
   - Use `mcp__apify__get-actor-output` with `offset` and `limit` parameters (same pagination as mcpc)
   - Read overflow files if the tool result points to one
4. All the same accuracy checks, field names, and validation rules apply regardless of whether mcpc or Apify MCP is used

**Display status when using fallback:**
```
mcpc CLI: Unavailable — using Apify MCP server (fallback)
Apify MCP: Connected
```

## Step 1: Scrape

### Single profile

Scrape via mcpc:
```bash
mcpc @apify tools-call apimaestro/linkedin-profile-posts username:={username} limit:=100 page_number:=1 --json
```

Record the `datasetId` from the response. The full data will be fetched via mcpc in Step 2.

### Batch (2+ profiles)

Use `Task` agents to scrape in parallel. 5 profiles per agent.

Each agent's prompt must include:
1. The usernames to scrape
2. Instructions to scrape each profile via mcpc:
   ```bash
   mcpc @apify tools-call apimaestro/linkedin-profile-posts username:={username} limit:=100 page_number:=1 --json
   ```
3. **"Return ONLY the datasetId and itemCount for each profile. Do NOT return raw post data."**

After all agents complete, collect the datasetIds and proceed.

## Step 2: Fetch, Filter, Validate, and Generate Report

Run **one** `python3 << 'EOF'` Bash command that does everything:

### 2a. Fetch data (CRITICAL: paginate to avoid 64KB buffer limit)

mcpc has a **64KB stdout buffer limit**. Fetching 100 items at once will truncate the JSON and break parsing. You MUST paginate.

**Performance optimizations (applied automatically):**
- **Parallel fetching** — all profiles fetch concurrently via `ThreadPoolExecutor`
- **Early date termination** — stop fetching a profile once posts fall outside the 3-month window
- **Field filtering** — only fetch the 5 fields needed, not the full post object

Concurrency scales to job size:
- 1 profile: no threading needed (sequential)
- 2-5 profiles: `max_workers = number of profiles`
- 6+ profiles: `max_workers = 7` (cap to avoid overwhelming mcpc)

```python
import subprocess, json
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor

PAGE_SIZE = 10  # DO NOT increase — 64KB buffer limit
FIELDS = "url,text,posted_at,stats,full_urn"  # Only fetch needed fields
MCPC_CMD = "mcpc"  # Set in Step 0 — may be "./node_modules/.bin/mcpc" or "npx @apify/mcpc"
cutoff = datetime.now() - timedelta(days=90)

def fetch_page(dataset_id, offset, limit):
    result = subprocess.run(
        [MCPC_CMD, "@apify", "tools-call", "get-actor-output",
         f"datasetId:={dataset_id}", f"offset:={offset}", f"limit:={limit}",
         f"fields:={FIELDS}", "--json"],
        capture_output=True, text=True, timeout=120
    )
    if result.returncode != 0 or len(result.stdout.encode()) >= 65530:
        return []  # Truncated or failed
    raw = json.loads(result.stdout)
    # Parse MCP response wrapper
    if isinstance(raw, dict) and "content" in raw:
        for c in raw["content"]:
            if isinstance(c, dict) and "text" in c:
                text = c["text"]
                if text.startswith("```json\n"): text = text[8:]
                if text.endswith("\n```"): text = text[:-4]
                return json.loads(text)
    return raw if isinstance(raw, list) else []

def fetch_profile(dataset_id):
    """Fetch all pages for one profile with early date termination."""
    all_items = []
    for offset in range(0, 100, PAGE_SIZE):
        items = fetch_page(dataset_id, offset, PAGE_SIZE)
        if not items:
            break
        all_items.extend(items)
        # Early termination: if the oldest post on this page is before cutoff, stop
        oldest = items[-1]
        pa = oldest.get("posted_at", {})
        ds = pa.get("date", "") if isinstance(pa, dict) else ""
        if ds:
            try:
                oldest_date = datetime.strptime(ds.split(" ")[0], "%Y-%m-%d")
                if oldest_date < cutoff:
                    break  # Remaining pages are even older — stop
            except ValueError:
                pass
        if len(items) < PAGE_SIZE:
            break  # Last page
    return all_items

# Fetch all profiles in parallel
num_profiles = len(profiles)
workers = min(num_profiles, 7) if num_profiles > 1 else 1

if workers == 1:
    # Single profile — no threading overhead
    results = {username: fetch_profile(dsid) for username, dsid in profiles.items()}
else:
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(fetch_profile, dsid): username for username, dsid in profiles.items()}
        results = {futures[f]: f.result() for f in futures}
```

**Field names in the dataset** (these are the actual field names — do NOT guess):
- `url` — the LinkedIn post URL (NOT `post_url`)
- `text` — the post content
- `posted_at.date` — date string in format `"YYYY-MM-DD HH:MM:SS"`
- `stats` — engagement object with `total_reactions`, `comments`, `reposts`
- `full_urn` — unique post identifier string (e.g. `urn:li:ugcPost:1234567890`)

### 2b. Filter to last 3 months

Calculate the cutoff date as **today minus 90 days**.

```python
from datetime import datetime, timedelta
cutoff = datetime.now() - timedelta(days=90)
```

Only keep posts where `posted_at.date` (format: `"YYYY-MM-DD HH:MM:SS"`) is **on or after** the cutoff date. Discard all older posts.

**The 3-month window is a hard requirement.** Every post in the final report must have a date within this window. If a profile has no posts in the window, display "No posts found in the last 3 months."

### 2c. Anti-hallucination checks (CRITICAL — DO NOT SKIP)

Run these checks on ALL filtered data before generating the report:

**URL verification:**
- Every post URL must contain `linkedin.com`
- Reject any URL with placeholder patterns: `1234567890`, `0000000000`, `#`, `example.com`
- Reject any URL that is not a unique, real LinkedIn post link

**Date verification:**
- No post dates in the future
- No post dates before the 3-month cutoff (should already be filtered, but double-check)
- Flag if multiple posts share the exact same timestamp

**Content verification:**
- No obvious template or placeholder text
- Flag if >50% of posts have identical or near-identical content

**Duplicate detection:**
- No duplicate `full_urn` values across all posts
- Deduplicate if found

**If checks fail:**
- Log warnings for each failed check
- Include affected posts in the report with explicit `[WARNING]` text
- If >50% of all data fails checks, STOP and ask the user before generating the report
- Do NOT re-scrape automatically
- Never fabricate, estimate, or fill in missing data

### 2d. Generate HTML

Write the HTML file directly. Structure:

```
- Title: "{username}'s LinkedIn Posts — Last 3 Months" (or "Batch Report — {N} Profiles")
- Subtitle: "Posts from {cutoff_date} to {today}" — always show the exact date range
- For each profile (batch): username as section heading
- Posts table columns: #, Date, Post URL (clickable "View post"), Content, Engagement
- Engagement column: show `stats.total_reactions`, `stats.comments`, `stats.reposts` (e.g. "42 reactions · 5 comments · 3 reposts")
- Posts sorted newest first
- Content truncated to ~300 chars with "..." if longer
- If 0 posts: "No posts found in the last 3 months (since {cutoff_date})"
- Footer: "Generated on {date} via Apify MCP + Claude Code"
- Footer: validation summary — e.g. "X posts verified, 0 warnings" or "X posts verified, Y warnings — see flagged rows"
```

### Output file
- Single: `linkedin-report-{username}.html` in the working directory
- Batch: `linkedin-posts-batch-{N}.html` in the working directory

### Styling
- Background: `#f3f2ef`
- Cards: `#fff`, `border-radius: 12px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`
- Table header: `#1b1f23` background, white text
- Font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Max width: `960px`, centered
- Self-contained HTML with inline styles (no external dependencies)

## Step 3: Validate via Apify Actors (Spot-Check)

After generating the report, spot-check a sample of posts to verify the scraped data is real.

### How to validate

Use the RAG web browser via mcpc to fetch the actual LinkedIn post page and compare:

```bash
mcpc @apify tools-call apify-slash-rag-web-browser \
  'query:=Show the author and content of this LinkedIn post' \
  'startUrls:=[{"url":"POST_URL_HERE"}]' \
  'maxResults:=1' --json
```

**Note:** LinkedIn requires authentication, so spot-checks will typically return a login wall redirect. This is expected and counts as "inconclusive" — not a failure. The key check is that the URL doesn't 404 and has valid LinkedIn post URL structure.

**Sample size:**
- Single profile: 2 posts
- Batch 2-10: 2 posts from 2-3 random profiles
- Batch 11+: 2 posts from 3-5 random profiles

**For each sampled post:**
1. Fetch the post's LinkedIn URL via mcpc + Apify actor
2. Compare: does the content snippet match? Does the author match?
3. If it matches → pass
4. If it doesn't match or fetch fails with login wall → note as "inconclusive" (this is expected for LinkedIn)

**Report validation result** to user:
```
Validation: 2/2 posts spot-checked — passed (or: 1 passed, 1 inconclusive)
```

If validation reveals the scraped data is wrong (author mismatch, content mismatch), flag the affected profile and warn the user.

## Step 4: Open and Summarize

1. Run `open {filepath}` to open in browser
2. Display a brief summary:
   ```
   Report: linkedin-report-{username}.html
   Date range: {cutoff_date} — {today}
   Posts in window: {N}
   Anti-hallucination: {N} posts checked, {N} warnings
   Validation: {N}/{N} spot-checks passed
   Apify cost: ~$0.05-0.10
   ```

## Error Handling

- **mcpc not installed**: Offer user local (`npm install @apify/mcpc`), npx, or global install. See Step 0.
- **mcpc completely unavailable** (install fails, auth fails, repeated errors): Fall back to Apify MCP server tools. See Step 0 Fallback section.
- **mcpc session expired or not connected**: `{MCPC} @apify close && {MCPC} mcp.apify.com connect @apify`. If OAuth fails, direct to `https://mcp.apify.com`.
- **mcpc 64KB buffer truncation**: Reduce page size to `limit:=10` and use `fields:=` to select only needed columns. Check `len(result.stdout.encode()) >= 65530` to detect truncation.
- **mcpc timeout**: Add `--timeout 600` for datasets with 100+ items
- **0 posts returned**: Tell user the profile may be private or inactive. Do NOT retry.
- **Anti-hallucination check fails on >50% of data**: STOP and ask the user.
- **Validation spot-check fails**: Flag the profile with a warning. Do NOT re-scrape automatically.
- **Agent fails (batch)**: Report which failed, include data from successful agents.

## Guidelines

### Stay in scope
- The output is a **table of post URLs, content, and engagement for the last 3 months**. Nothing more.
- Do not add profile summaries, follower counts, type badges, confidence scores, or pattern analysis.
- If the user wants more, they will ask for it.

### Accuracy is paramount
- **All data comes from Apify only.** Every post URL, every content snippet, every engagement number must originate from an Apify Actor run. No other data source is acceptable.
- Anti-hallucination checks run on EVERY post before the report is generated. These checks are not optional.
- Spot-check validation runs AFTER the report, using Apify actors to verify real LinkedIn pages.
- Never fabricate URLs, dates, or content. If data is missing, say it's missing.
- Every post URL in the report must be a real, scraped LinkedIn URL — never a placeholder.
- The 3-month window (today minus 90 days) is strictly enforced — no posts outside this range appear in the report.
- If accuracy cannot be verified (e.g. Apify returns no data, checks fail on >50%), **STOP and tell the user** rather than delivering a potentially inaccurate report.

### mcpc CLI (Primary Tool) / Apify MCP (Fallback)
- **mcpc is the primary tool** — scraping, data retrieval, validation, everything
- **Apify MCP server is the fallback** — same Actors, same data, different interface. Use if mcpc is unavailable.
- **No other tools.** All scraping and data retrieval MUST go through the Apify ecosystem (mcpc or Apify MCP). No exceptions.
- Session name: `@apify`
- Always use `--json` flag for machine-readable output
- Pipe directly to processing — never save to intermediate files
- **64KB stdout buffer limit (mcpc only)** — always paginate with `limit:=10` and use `fields:=` to select only needed columns
- Key patterns (mcpc):
  - Scrape: `mcpc @apify tools-call apimaestro/linkedin-profile-posts username:=XXX limit:=100 page_number:=1 --json`
  - Fetch (paginated): `mcpc @apify tools-call get-actor-output datasetId:=XXXXX offset:=0 limit:=10 fields:=url,text,posted_at,stats,full_urn --json`
  - Validate: `mcpc @apify tools-call apify-slash-rag-web-browser query:=... 'startUrls:=[{"url":"..."}]' maxResults:=1 --json`
- Key patterns (Apify MCP fallback):
  - Scrape: `mcp__apify__call-actor` with `actor: "apimaestro/linkedin-profile-posts"`
  - Fetch (paginated): `mcp__apify__get-actor-output` with `datasetId`, `offset`, `limit`, `fields`
  - Validate: `mcp__apify__apify-slash-rag-web-browser`
- If mcpc session expires: `mcpc @apify close && mcpc mcp.apify.com connect @apify`

### Performance
- **Local install preferred** — `./node_modules/.bin/mcpc` skips npx resolution overhead (~2-3s per call). Ask user during Step 0.
- **Parallel fetching** — use `ThreadPoolExecutor` to fetch all profiles concurrently. Cap at 7 workers.
- **Early date termination** — posts are sorted newest-first. Once a page's oldest post is before the 3-month cutoff, stop fetching that profile. Saves 30-60% of calls for profiles with long histories.
- **Field filtering** — `fields:=url,text,posted_at,stats,full_urn` reduces payload ~80% vs fetching full objects.

### Batch execution
- Agents only run during scraping — they use mcpc to scrape, and return datasetIds only
- After scraping, all processing happens in one inline python command
- Do NOT launch agents for filtering, validation, or report generation
