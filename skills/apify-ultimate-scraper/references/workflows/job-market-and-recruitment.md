# Job market and recruitment workflows

## Job listing research
**When:** User wants to find and analyze job postings by role, company, or location.

### Pipeline
1. **Search jobs** -> `harvestapi/linkedin-job-search`
   - Key input: `keyword`, `location`, `datePosted`, `limit`
2. **Get job details** -> `apimaestro/linkedin-job-detail`
   - Pipe: `results[].jobUrl` -> `urls`
   - Key input: `urls`

### Output fields
Step 1: `title`, `company`, `location`, `jobUrl`, `postedDate`, `applicantsCount`
Step 2: `description`, `requirements`, `seniority`, `employmentType`, `salary`

### Gotcha
Both Actors are PPE. Step 1: ~$0.001/job. Step 2: ~$0.005/job. For 200 jobs, total ~$1.20. Estimate and confirm with user.

## Multi-board job search with cross-board deduplication
**When:** User wants postings for a role and location from several boards (LinkedIn, Indeed, Glassdoor, The Muse) as one table, without the same job appearing once per board.

### Pipeline
1. **Search all boards in one run** -> `flash_scraper/multi-jobboard-scraper`
   - Key input: `searchTerm`, `location`, `sites` (e.g. `["linkedin","indeed","glassdoor","muse"]`), `maxResults` (per board), `countryIndeed` (required for Indeed/Glassdoor), `strictKeywordMatch`
2. **Watch named companies instead of boards** (optional) -> same Actor with `atsCompanies` (Greenhouse/Lever/Ashby boards read directly) and `onlyNewJobs: true` on a schedule; `webhookUrl` posts new rows to Slack/Discord

### Output fields
Step 1: `title`, `company`, `location`, `site`, `date_posted`, `job_url`, `found_on_sites[]`, `duplicate_count`, `salary_min`, `salary_max`, `salary_interval` (filled on 59-70% of rows on a default run with LinkedIn detail fetching on; 56-60% with it off, measured 2026-08-07/23)

### Cost estimate
PPE, $0.005/job on the free plan (Store pricing read 2026-09-05) plus a $0.00005 run start; deduplicated and filtered rows are not billed. 4 boards x 20 rows = at most $0.40.

### Gotcha
`maxResults` is per board, not per run. Salary is only present where the board publishes it; `requireSalary: true` drops the rest before billing. A board that throttles shows 0 rows in the log while the run still succeeds - rerun with a narrower term rather than a higher cap.

## Remote-only job feed
**When:** User wants remote jobs only, from the remote boards, with no city in the query.

### Pipeline
1. **Aggregate remote boards** -> `flash_scraper/remote-job-aggregator`
   - Key input: `searchTerms`, `boards` (RemoteOK, We Work Remotely, Remotive, Jobicy, Himalayas, HN "Who is hiring", ...), `maxItems`, `matchDescriptions`, `postedWithinDays`, `salaryMinAnnual`, `countries`, `excludeKeywords`
2. **Only new jobs on a schedule** (optional) -> `onlyNewJobs: true`

### Output fields
Step 1: `title`, `company`, `location`, `source_board`, `posted_at`, `url`, `job_id`, `salary_min`, `salary_max`, `salary_text` (salary on 35% of rows on the 2026-08-15 default run), `tags[]`, `seniority`, `job_type`

### Cost estimate
PPE, $0.002/job on the free plan (Store pricing read 2026-09-05; a scheduled record raises it to $0.003/job on 2026-09-14 - read the Actor's Pricing tab); a 100-row run is about $0.20, $0.30 after that date. No API key or proxy.

### Gotcha
`matchDescriptions: true` matches the keyword in descriptions as well as titles and multiplies volume (the Actor README's measured example: 28 rows title-only vs 194 with descriptions for `python`). Use `strictFilters: true` when the user complains about off-topic rows.

## Candidate sourcing
**When:** User wants to find potential candidates matching specific criteria.

### Pipeline
1. **Search profiles** -> `harvestapi/linkedin-profile-search`
   - Key input: `keyword`, `title`, `location`, `industry`, `limit`
2. **Enrich with details** -> `apimaestro/linkedin-profile-full-sections-scraper`
   - Pipe: `results[].profileUrl` -> `urls`
   - Key input: `urls`

### Output fields
Step 1: `fullName`, `headline`, `location`, `profileUrl`, `currentCompany`
Step 2: `experience[]`, `education[]`, `skills[]`, `certifications[]`, `languages[]`

### Gotcha
Step 2 (`apimaestro/linkedin-profile-full-sections-scraper`) costs ~$0.01/profile - the most expensive LinkedIn scraper. Use sparingly for shortlisted candidates only.

## Sales signal outreach - job posting as buying signal
**When:** User wants to monitor company job postings as a signal to identify sales opportunities - e.g., a "Head of Data Engineering" hire suggests budget for data tooling.

### Pipeline
1. **Monitor target postings** -> `harvestapi/linkedin-job-search`
   - Key input: `searchUrl` (LinkedIn Jobs URL with company or role filters), `keywords`
2. **Get company context** -> `harvestapi/linkedin-company`
   - Pipe: `results[].companyUrl` -> `companyUrls`

### Output fields
Step 1: `title`, `companyName`, `description`, `employmentType`, `seniorityLevel`, `jobUrl`
Step 2: `name`, `industry`, `employeeCount`, `description`, `specialties[]`

### Gotcha
Job descriptions contain implicit buying signals - tech stack mentions, pain points, and headcount growth. Pass `description` to an LLM to extract inferred tech stack and budget tier before prioritizing outreach. Contact finding (Hunter.io) uses the native n8n node, not an Apify Actor.

## Upwork job monitoring for freelancers
**When:** User wants to continuously monitor Upwork for new jobs matching their skills.

### Pipeline
1. **Scrape Upwork search** -> `apify/playwright-scraper`
   - Key input: `startUrls` (Upwork search URL with skill filters), `pseudoUrls`, `maxCrawledPages`

### Output fields
Step 1: `title`, `description`, `budget`, `clientJobsPosted`, `clientHireRate`, `postedAt`, `url`

### Gotcha
No dedicated Upwork Actor exists in Apify Store - verify with `apify actors search "upwork" --user-agent apify-agent-skills/apify-ultimate-scraper` for community options before defaulting to `apify/playwright-scraper`. Upwork pages are JS-heavy so Playwright is required over basic HTTP scraping. For high-frequency monitoring (every 15 min), store seen job URLs to avoid re-processing duplicates.

## GitHub contributor discovery
**When:** User wants to find developers who contribute to specific open-source projects.

### Pipeline
1. **Get contributors** -> `janbuchar/github-contributors-scraper`
   - Key input: `repoUrls`

### Output fields
Step 1: `username`, `contributions`, `profileUrl`, `avatarUrl`
