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

**Configuration:**
- **Mode:** `Short ($4 per 1k)` — captures location data efficiently
- **maxItems:** Set high enough to capture the full workforce (e.g., 300+ for a ~200-person company)

**Run the Actor:**

```bash
node --env-file=.env ${CLAUDE_PLUGIN_ROOT}/reference/scripts/run_actor.js \
  --actor "harvestapi/linkedin-company-employees" \
  --input '{"companies": ["LINKEDIN_COMPANY_URL"], "profileScraperMode": "Short ($4 per 1k)", "maxItems": 300}' \
  --output YYYY-MM-DD_COMPANY_employees.json \
  --format json
```

**After the run completes, aggregate results by country:**

From the JSON output, extract the `location.linkedinText` field from each employee profile. Group employees by country (parse country from `location.linkedinText`, e.g., "Prague, Czechia" → Czechia). If `location.countryCode` is available, use that for grouping.

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

Use the `apify/rag-web-browser` Actor via mcpc to search for historical workforce/headcount data.

**Run the RAG web browser via mcpc:**

```bash
export $(grep APIFY_TOKEN .env | xargs) && mcpc --json mcp.apify.com --header "Authorization: Bearer $APIFY_TOKEN" tools-call run-actor actorId:="apify/rag-web-browser" input:='{"query": "COMPANY_NAME employee count history chart", "maxResults": 3}' | jq -r ".content"
```

Replace `COMPANY_NAME` with the company name (e.g., "Apify"). The query should target historical headcount data.

**Primary source: GetLatka.com**

GetLatka (getlatka.com/companies/COMPANY_SLUG) is the best source for SaaS company workforce data. If the RAG browser results include GetLatka, extract:
- Historical headcount numbers (yearly or quarterly)
- Revenue data (if available)
- Growth rate percentages
- Funding information (if available)

If the initial RAG query doesn't return GetLatka results, try a targeted follow-up:

```bash
export $(grep APIFY_TOKEN .env | xargs) && mcpc --json mcp.apify.com --header "Authorization: Bearer $APIFY_TOKEN" tools-call run-actor actorId:="apify/rag-web-browser" input:='{"query": "site:getlatka.com COMPANY_NAME employees revenue", "maxResults": 3}' | jq -r ".content"
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

## Error Handling

`APIFY_TOKEN not found` - Ask user to create `.env` with `APIFY_TOKEN=your_token`
`mcpc not found` - Ask user to install `npm install -g @apify/mcpc`
`Actor not found` - Check Actor ID spelling
`Run FAILED` - Ask user to check Apify console link in error output
`Timeout` - Reduce input size or increase `--timeout`
`GetLatka page not found` - Try alternative company name spellings, or search for "[Company] employee count history" as a broader OSINT query
`No employees found` - The company may have restricted visibility; try increasing maxItems or removing filters
`RAG browser returns irrelevant results` - Refine the search query; try adding year numbers or "headcount" to the query
