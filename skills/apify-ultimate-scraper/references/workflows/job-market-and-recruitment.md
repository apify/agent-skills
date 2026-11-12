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

## LinkedIn jobs from a search URL the user pasted
**When:** User pastes a LinkedIn job-search URL (`linkedin.com/jobs/search?...`) and wants those jobs as rows, or a daily alert for exactly that search, without a LinkedIn login.

### Pipeline
1. **Run the URL as the search** -> `flash_scraper/linkedin-jobs-scraper`
   - Key input: `searchUrls` (up to 25 URLs, each its own search; they replace `searchQueries`, `location`, `locations` and `geoId`), `maxItems` (per URL, default 100; a URL's `f_PP` cities share it)
2. **Only new postings on a schedule** (optional) -> same input plus `onlyNewJobs: true` and `webhookUrl`

### Output fields
Step 1: `jobTitle`, `companyName`, `location`, `postedDate`, `jobUrl`, `jobId`, `applicants` (LinkedIn's bucket, shown on about 55% of postings), `seniority`, `employmentType`, `sector`, `descriptionText`, `salaryMin`, `salaryMax` (only when the job page shows a base-pay range), `job_score`; `applyUrl` is always null

### Cost estimate
PPE, $0.002/job on the free plan (Store pricing read 2026-11-02) plus a $0.00005 run start; an empty run bills no jobs. One URL at the default `maxItems` = at most $0.20.

### Gotcha
LinkedIn's public search does not honour every URL filter. The Actor sends `keywords`, `geoId`/`location`, `distance`, `f_TPR` (any `r<seconds>`, e.g. `r3600` for the past hour), `f_C`, `f_AL` and `f_EA`; checks `f_E` on each job page; turns `f_JT`/`f_WT` into search keywords; searches each `f_PP` city as its own `geoId` (up to 10 per URL); and names what it did not use (`sortBy`, salary `f_SB2` - use `minSalary` - and other `f_` filters) in the status message and `RUN_SUMMARY.search_urls`. A URL that is not a job search (`/jobs/view/`, `/jobs/collections/`, a company page, an Indeed or Glassdoor URL) is not run and bills nothing; Indeed and Glassdoor search URLs go to `flash_scraper/multi-jobboard-scraper` (`searchUrls`). Job pages are read one at a time (about 1-2 s each), so keep `maxItems` at 100 or less on run-sync calls (300 s limit).

## Several job boards at once, deduplicated, or only-new monitoring
**When:** User wants one search run on several job boards at once (LinkedIn, Indeed, Glassdoor, The Muse) as one table without the same job once per board, or a scheduled feed that returns only postings it has not delivered before.

### Pipeline
1. **Search all boards in one run** -> `flash_scraper/multi-jobboard-scraper`
   - Key input: `searchTerm`, `location`, `sites` (default `["linkedin","indeed","glassdoor","muse"]`), `maxResults` (per board, default 20), `countryIndeed` (Indeed/Glassdoor country, default `usa`), `strictKeywordMatch`
2. **Only new postings on a schedule** (optional) -> same input plus `onlyNewJobs: true` (the first run is the baseline; later runs deliver and bill only postings this search has not delivered before, 90-day memory); `webhookUrl` posts a digest to Slack, Discord or any webhook when new rows land

### Output fields
Step 1: `title`, `company`, `location`, `site`, `date_posted`, `job_url`, `found_on_sites` (comma-separated boards), `duplicate_count`, `salary_min`, `salary_max`, `salary_interval` (filled on 59-70% of rows on a default run with LinkedIn detail fetching on; 56-60% with it off, measured 2026-08-07)

### Cost estimate
PPE, $0.005/job on the free plan (Store pricing read 2026-10-30) plus a $0.00005 run start; a job found on several boards bills once and filtered rows are not billed. 4 boards x 20 rows = at most $0.40.

### Gotcha
`maxResults` is per board, not per run. Salary is only present where the board publishes it; `requireSalary: true` drops the rest before billing. A board that fails (Glassdoor sometimes answers 403 for a whole run) bills nothing and is named in the run status and the run's `RUN_SUMMARY` key-value record; the other boards still deliver.

## Company careers pages (Greenhouse, Lever, Ashby and other ATS boards)
**When:** User names specific companies and wants their open roles straight from each company's own careers page, or an alert when they post new roles.

### Pipeline
1. **Read each company's careers board** -> `flash_scraper/multi-jobboard-scraper`
   - Key input: `atsCompanies` (company names, up to 20), `"sites": []` (skips the job-board search, so only the careers pages run and bill), `maxResults` (per company, newest first); leave `searchTerm` unset or at its default (`software engineer`) for each company's whole board, or set another term to keep only matching roles
2. **New roles only, on a schedule** (optional) -> same input plus `onlyNewJobs: true` and `webhookUrl`

### Output fields
Step 1: `title`, `company`, `location`, `site` (the ATS: `greenhouse`, `lever`, `ashby`, `recruitee`, `bamboohr` or `workable`), `date_posted`, `job_url`, `description`

### Cost estimate
PPE, $0.005/job on the free plan (Store pricing read 2026-10-30) plus a $0.00005 run start; a company that is not found costs nothing. `{"atsCompanies": ["bunq"], "sites": [], "maxResults": 5}` bills at most $0.025 plus the run start.

### Gotcha
Each name becomes a slug (`"Stripe Inc."` -> `stripeinc`) tried on Greenhouse, Lever, Ashby, Recruitee, BambooHR and Workable in that order; a company hosted elsewhere or under a different slug reads "not found" in `RUN_SUMMARY` and bills nothing. Without `"sites": []` the default job boards also run and bill. For software-engineer roles only, add `requireTitleKeywords: ["software engineer"]`: it filters titles after the per-company `maxResults` cap and before billing.

## Remote-only job feed
**When:** User wants remote jobs only, from the remote boards, with no city in the query.

### Pipeline
1. **Aggregate remote boards** -> `flash_scraper/remote-job-aggregator`
   - Key input: `searchTerms`, `boards` (RemoteOK, We Work Remotely, Remotive, Jobicy, Himalayas, HN "Who is hiring", ...), `maxItems`, `matchDescriptions`, `postedWithinDays`, `salaryMinAnnual`, `countries`, `excludeKeywords`
2. **Only new jobs on a schedule** (optional) -> `onlyNewJobs: true`

### Output fields
Step 1: `title`, `company`, `location`, `source_board`, `posted_at`, `url`, `job_id`, `salary_min`, `salary_max`, `salary_text` (salary on 35% of rows on the 2026-08-15 default run), `tags[]`, `seniority`, `job_type`

### Cost estimate
PPE, $0.003/job on the free plan (Store pricing read 2026-10-30) plus a $0.00005 run start; a 100-row run is about $0.30. No API key or proxy.

### Gotcha
`matchDescriptions: true` also matches the keyword in tags and the first 500 description characters and multiplies volume (the Actor README's measured example: 28 rows title-only vs 194 with it on for `python`); API calls that omit it stay title-only. For off-topic rows, turn it off or add `excludeKeywords`; `strictFilters: true` does not narrow keywords, it drops rows missing the data a set filter needs (no date, no salary, unreadable location).

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
