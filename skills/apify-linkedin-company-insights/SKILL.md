---
name: apify-linkedin-company-insights
description: Analyze LinkedIn company workforce by scraping employee data per country and historical workforce growth trends. Use when user provides a LinkedIn company URL and wants employee distribution by country or headcount history.
---

# LinkedIn Company Insights

Research LinkedIn companies by extracting employee distribution per country (via LinkedIn People tab scraping) and historical workforce growth data (via OSINT web research on GetLatka).

## Prerequisites
(No need to check it upfront)

- `.env` file with `APIFY_TOKEN`
- Node.js 20.6+ (for native `--env-file` support)
- `mcpc` CLI tool: `npm install -g @apify/mcpc`

## Workflow

This skill has two independent phases that produce a combined insights report.

Copy this checklist and track progress:

```
Task Progress:
- [ ] Step 1: Validate input (LinkedIn company URL)
- [ ] Step 2: Fetch Actor schema via mcpc (dynamic discovery)
- [ ] Step 3: Scrape employees and aggregate by country (Phase 1)
- [ ] Step 4: Research historical workforce growth via RAG web browser (Phase 2)
- [ ] Step 5: Produce the final combined insights report
- [ ] Step 6: Generate interactive HTML dashboard with charts
```

### Step 1: Validate Input

The user must provide one or more LinkedIn company URLs in the format:
- `https://www.linkedin.com/company/COMPANY_NAME`
- `https://linkedin.com/company/COMPANY_NAME`

Extract the company slug from the URL (e.g., `apify` from `linkedin.com/company/apify`). This slug is used in both phases.

### Step 2: Fetch Actor Schema (Dynamic Discovery)

Fetch the employee scraper Actor's input schema dynamically using mcpc:

```bash
export $(grep APIFY_TOKEN .env | xargs) && mcpc --json mcp.apify.com --header "Authorization: Bearer $APIFY_TOKEN" tools-call fetch-actor-details actor:="harvestapi/linkedin-company-employees" | jq -r ".content"
```

This returns:
- Actor description and README
- Required and optional input parameters
- Output fields (if available)

Use this schema to construct the correct input for the Actor run in Step 3. Key input parameters to look for:
- `companies` — array of LinkedIn company URLs
- `profileScraperMode` — scraping depth ("Short" for speed/cost, "Full" for complete data)
- `maxItems` — limit on number of profiles to scrape

---

## Phase 1: Employees per Country

### Step 3: Scrape Employees and Aggregate by Country

Use the `harvestapi/linkedin-company-employees` Actor to scrape the company's employee profiles from the LinkedIn People tab.

> **Important:** This Actor requires a paying Apify account to return full results. On free/unpaid accounts, it silently returns only page 1 (25 profiles) regardless of `maxItems` or `takePages` settings. If you get only 25 results for a company that should have more, check the account billing status.

**Configuration:**
- **Mode:** `Short ($4 per 1k)` — captures location data efficiently
- **maxItems:** Set high enough to capture the full workforce (e.g., 300+ for a ~200-person company). Use `0` to scrape all available (up to 2500).

**Run the Actor:**

```bash
node --env-file=.env ${CLAUDE_PLUGIN_ROOT}/reference/scripts/run_actor.js \
  --actor "harvestapi/linkedin-company-employees" \
  --input '{"companies": ["LINKEDIN_COMPANY_URL"], "profileScraperMode": "Short ($4 per 1k)", "maxItems": 300}' \
  --output YYYY-MM-DD_COMPANY_employees.json \
  --format json
```

> **Fallback Actor:** If `harvestapi` is unavailable or too expensive, `apimaestro/linkedin-company-employees-scraper-no-cookies` ($10/1k) returns fewer results but provides pre-parsed location fields (`country`, `city`, `country_code`). Use input: `{"identifier": "LINKEDIN_COMPANY_URL", "max_employees": 500}`.

**After the run completes, aggregate results by country:**

From the JSON output, extract the `location.linkedinText` field from each employee profile. Group employees by country (parse country from `location.linkedinText`, e.g., "Prague, Czechia" → Czechia). If `location.parsed.country` is available (in Full mode), use that for grouping.

Build the **Employees per Country** table:

| Country | Employee Count | % of Total |
|---------|----------------|------------|
| Czechia | 172 | 86.4% |
| United States | 12 | 6.0% |
| United Kingdom | 6 | 3.0% |
| ... | ... | ... |
| **Total** | **199** | **100%** |

Sort by employee count descending.

---

## Phase 2: Workforce History & Growth Trends

### Step 4: Research Historical Workforce Growth via RAG Web Browser

**Important:** Do NOT use dedicated LinkedIn "Insights" scrapers for this step — they frequently time out or return empty datasets due to LinkedIn's anti-scraping measures on the Insights tab. Instead, use OSINT via the RAG web browser.

Use the `apify/rag-web-browser` Actor via mcpc `call-actor` to search for historical workforce/headcount data.

**Run the RAG web browser via mcpc:**

```bash
export $(grep APIFY_TOKEN .env | xargs) && mcpc --json mcp.apify.com --header "Authorization: Bearer $APIFY_TOKEN" tools-call call-actor actor:="apify/rag-web-browser" input:='{"query": "COMPANY_NAME employee count history chart", "maxResults": 3}' 2>&1 | jq -r '.content[0].text'
```

> **Note:** Use `call-actor` with `actor:=` (not `actorId:=`). The output uses flattened keys (e.g., `metadata.url`, `metadata.title`, `searchResult.resultType`) rather than nested objects. Use `2>&1` to capture errors — mcpc may fail silently with exit code 0 on tool name mismatches.

Replace `COMPANY_NAME` with the company name (e.g., "Apify"). The query should target historical headcount data.

**Primary source: GetLatka.com**

GetLatka (getlatka.com/companies/COMPANY_SLUG) is the best source for SaaS company workforce data. However, note that GetLatka often has **limited headcount data** (sometimes only the latest year). Revenue history is typically more complete. If the RAG browser results include GetLatka, extract:
- Historical headcount numbers (yearly or quarterly) — may be sparse
- Revenue data (if available — usually more complete than headcount)
- Growth rate percentages
- Funding information (if available)

If the initial RAG query doesn't return GetLatka results, try a targeted follow-up:

```bash
export $(grep APIFY_TOKEN .env | xargs) && mcpc --json mcp.apify.com --header "Authorization: Bearer $APIFY_TOKEN" tools-call call-actor actor:="apify/rag-web-browser" input:='{"query": "site:getlatka.com COMPANY_NAME employees revenue", "maxResults": 3}' 2>&1 | jq -r '.content[0].text'
```

**Build the Workforce Growth Trends table:**

Combine historical data from GetLatka with the live LinkedIn employee count from Phase 1:

| Year | Headcount | Change | Growth Rate | Source |
|------|-----------|--------|-------------|--------|
| 2020 | 40 | — | — | GetLatka |
| 2021 | 65 | +25 | +62.5% | GetLatka |
| 2022 | 85 | +20 | +30.8% | GetLatka |
| 2023 | 100 | +15 | +17.6% | GetLatka |
| 2024 | 116 | +16 | +16.0% | GetLatka |
| 2025 | 199 | +83 | +71.6% | LinkedIn (live) |

**Fallback:** If GetLatka does not have data for the company, note this and use employee tenure data from Phase 1 (`currentPositions[].tenureAtCompany`) as a proxy for growth patterns (e.g., many recent hires suggest rapid growth).

---

## Producing Results

### Step 5: Produce the Final Combined Insights Report

Combine the results from Phase 1 and Phase 2 into a comprehensive company insights report.

**Report structure:**

1. **Company Overview**
   - Company name, LinkedIn URL
   - Total employees found on LinkedIn
   - Data collection date

2. **Employee Distribution by Country** (from Phase 1)
   - Full country breakdown table, sorted by count
   - Geographic concentration metric (% in top country)

3. **Workforce Growth Trends** (from Phase 2)
   - Historical headcount table with sources
   - Revenue data (if available from GetLatka)
   - Growth trajectory assessment (rapid growth / steady / declining / stagnant)

4. **Key Insights**
   - Top 3 countries by employee count
   - Geographic concentration (e.g., "86% of workforce in Czechia")
   - Growth trajectory (e.g., "71.6% YoY growth from 2024 to 2025")
   - Average employee tenure (from `tenureAtCompany` data if available)
   - Notable hiring patterns (many recent hires in specific locations)

If the user provided **multiple company URLs**, repeat Phases 1-2 for each company and produce a side-by-side comparison table.

**Save the full report as CSV (optional):**
```bash
node --env-file=.env ${CLAUDE_PLUGIN_ROOT}/reference/scripts/run_actor.js \
  --actor "harvestapi/linkedin-company-employees" \
  --input '{"companies": ["LINKEDIN_COMPANY_URL"], "profileScraperMode": "Short ($4 per 1k)", "maxItems": 300}' \
  --output YYYY-MM-DD_COMPANY_linkedin_insights.csv \
  --format csv
```

### Step 6: Generate Interactive HTML Dashboard with Charts

After producing the text report, create a **self-contained HTML dashboard** that visualizes all collected data with interactive charts. The dashboard must be a single `.html` file with no external dependencies (inline all CSS and JS, use Chart.js loaded from CDN).

**Output location:**
- **Linux / macOS:** Save to `/tmp/YYYY-MM-DD_COMPANY_linkedin_dashboard.html`
- **Windows (or if `/tmp` is not writable):** Save to the OS temp directory, e.g., `%TEMP%\YYYY-MM-DD_COMPANY_linkedin_dashboard.html`. Use the system's default temp path.

Replace `YYYY-MM-DD` with the current date and `COMPANY` with the company slug.

**Dashboard layout and sections:**

1. **Header**
   - Company name, LinkedIn URL (clickable), data collection date
   - Total employee count badge
   - Clean, modern styling (light background, card-based layout)

2. **Employee Distribution by Country** (from Phase 1)
   - **Donut/pie chart** showing top 10 countries, with remaining grouped as "Other"
   - **Horizontal bar chart** showing all countries sorted by employee count
   - **Data table** below the charts with Country, Employee Count, and % of Total columns
   - Color-code the top 3 countries consistently across chart and table

3. **Workforce Growth Trends** (from Phase 2)
   - **Line chart** plotting headcount over time (X-axis: year, Y-axis: headcount)
   - Visually distinguish data sources (e.g., solid line for GetLatka historical data, dashed line or distinct marker for the live LinkedIn data point)
   - **Bar chart** showing year-over-year absolute change
   - **Growth rate annotation** on the line chart for each data point (e.g., "+62.5%")
   - If revenue data is available, overlay it as a secondary Y-axis line

4. **Key Insights Summary**
   - Card-style widgets showing: top country + %, total countries, YoY growth rate, growth trajectory label (rapid/steady/declining/stagnant)
   - If employee tenure data is available, include an average tenure card

5. **Multi-Company Comparison** (only if multiple companies were analyzed)
   - Side-by-side bar chart comparing total headcount
   - Overlaid line chart comparing growth trajectories
   - Comparison table with key metrics per company

**Technical requirements:**
- Load Chart.js from CDN: `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`
- All data must be embedded as inline `<script>` JSON variables — the dashboard must work offline after initial load
- Responsive design — should look good on both desktop and mobile
- Use a clean color palette (e.g., blues/teals for the primary company, grays for secondary data)
- Include a small footer: "Generated by Apify LinkedIn Company Insights Skill · {date}"

**After saving, print the file path so the user can open it in a browser:**

```
Dashboard saved to: /tmp/YYYY-MM-DD_COMPANY_linkedin_dashboard.html
Open in browser: file:///tmp/YYYY-MM-DD_COMPANY_linkedin_dashboard.html
```

---

## Error Handling

`APIFY_TOKEN not found` - Ask user to create `.env` with `APIFY_TOKEN=your_token`
`mcpc not found` - Ask user to install `npm install -g @apify/mcpc`
`Actor not found` - Check Actor ID spelling
`Run FAILED` - Ask user to check Apify console link in error output
`Timeout` - Reduce input size or increase `--timeout`
`GetLatka page not found` - Try alternative company name spellings, or search for "[Company] employee count history" as a broader OSINT query
`No employees found` - The company may have restricted visibility; try increasing max_employees or removing filters
`RAG browser returns irrelevant results` - Refine the search query; try adding year numbers or "headcount" to the query
`mcpc silent failure` - Always use `2>&1` to capture mcpc stderr; mcpc may return exit code 0 with empty output on tool name mismatches
`mcpc search-actors validation error` - All 4 parameters are required: `limit`, `offset`, `keywords`, `category` (use empty string `""` for category). The search param is `keywords`, not `search`
`harvestapi returns only 25 profiles` - This is caused by a non-paying Apify account. Upgrade to a paying plan to unlock full pagination. As a fallback, use `apimaestro/linkedin-company-employees-scraper-no-cookies` (returns fewer results but works on free accounts)
`mcpc call-actor timeout` - Some Actors take longer via mcpc; use `run_actor.js` script as fallback (it uses the REST API directly with configurable timeout)
