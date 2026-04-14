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
No dedicated Upwork Actor exists in Apify Store - verify with `apify actors search "upwork"` for community options before defaulting to `apify/playwright-scraper`. Upwork pages are JS-heavy so Playwright is required over basic HTTP scraping. For high-frequency monitoring (every 15 min), store seen job URLs to avoid re-processing duplicates.

## GitHub contributor discovery
**When:** User wants to find developers who contribute to specific open-source projects.

### Pipeline
1. **Get contributors** -> `janbuchar/github-contributors-scraper`
   - Key input: `repoUrls`

### Output fields
Step 1: `username`, `contributions`, `profileUrl`, `avatarUrl`
