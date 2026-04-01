# Lead generation workflows

## Local business leads with email enrichment
**When:** User wants business contacts, emails, or phone numbers for businesses in a specific location.

### Pipeline
1. **Find businesses** -> `compass/crawler-google-places`
   - Key input: `searchStringsArray`, `locationQuery`, `maxCrawledPlaces`
2. **Enrich with contacts** -> `compass/enrich-google-maps-dataset-with-contacts`
   - Pipe: `results[].url` -> `startUrls` (or pass the dataset ID directly)
   - Key input: `datasetId` (from step 1), `maxRequestsPerCrawl`

### Output fields
Step 1: `title`, `address`, `phone`, `website`, `categoryName`, `totalScore`, `reviewsCount`, `url`
Step 2: `emails[]`, `phones[]`, `socialLinks`, `linkedInUrl`, `twitterUrl`

### Gotcha
Google Maps results vary by language and location. Set `language: "en"` explicitly. Also set `locationQuery` to a specific city/region, not just a country.

---

## B2B prospect discovery via LinkedIn
**When:** User wants to find professionals by role, company, or industry.

### Pipeline
1. **Search profiles** -> `harvestapi/linkedin-profile-search`
   - Key input: `keyword`, `location`, `title`, `limit`
2. **Enrich with details** -> `harvestapi/linkedin-profile-scraper`
   - Pipe: `results[].profileUrl` -> `urls`
   - Key input: `urls`, `includeEmail` (set to `true` for email discovery)

### Output fields
Step 1: `fullName`, `headline`, `location`, `profileUrl`, `currentCompany`
Step 2: `experience[]`, `education[]`, `skills[]`, `email`, `phone`

### Cost estimate
Step 2 with `includeEmail: true` costs ~$0.01/profile. For 500 profiles, budget ~$5.

### Gotcha
LinkedIn Actors are all PPE. Estimate and confirm with user before running at scale.

---

## Sales Navigator bulk lead extraction
**When:** User wants daily 100-1,000 lead extraction from a Sales Navigator search for outbound sequences.

### Pipeline
1. **Extract leads** -> `harvestapi/linkedin-profile-search`
   - Key input: `searchUrl` (Sales Navigator search URL), `maxResults`, `proxy` settings
2. **Verify emails** -> native n8n Hunter.io node or HTTP Request to ZeroBounce API
   - Pipe: `results[].email` -> email verification input

### Output fields
Step 1: `fullName`, `email`, `companyName`, `jobTitle`, `connectionDegree`, `profileUrl`
Step 2: `result` (valid/risky/invalid), `score`

### Cost estimate
`harvestapi/linkedin-profile-search` is PPE. 1,000 leads at typical rates runs ~$5-10. Confirm before scheduling daily runs.

### Gotcha
Sales Navigator URL must be a saved search URL, not a one-time results URL. The URL changes each session unless saved.

---

## SERP-based B2B prospect discovery
**When:** User wants to find companies matching niche keywords via Google, AI-qualify them against ICP criteria, and push qualified leads to CRM.

### Pipeline
1. **Find companies** -> `apify/google-search-scraper`
   - Key input: `queries` (search terms array), `maxResultsPerPage`, `countryCode`
2. **Crawl company sites** -> `apify/website-content-crawler`
   - Pipe: `results[].organicResults[].url` -> `startUrls`
   - Key input: `startUrls`, `maxCrawlDepth` (set to 2), `maxCrawlPages` (set to 5)

### Output fields
Step 1: `organicResults[].url`, `organicResults[].title`, `organicResults[].snippet`
Step 2: `text` (clean markdown), `url`, `metadata.title`, `metadata.description`

### Gotcha
Pass only company root domains from SERP results into WCC - not individual blog post URLs. Filter `organicResults[].url` for root domains before piping.

---

## Apollo leads + AI website icebreakers
**When:** User has an Apollo lead list with company websites and wants personalized cold email icebreakers generated from each company's web presence.

### Pipeline
1. **Scrape company sites** -> `apify/website-content-crawler`
   - Key input: `startUrls` (homepage URLs from Apollo export), `maxCrawlDepth` (set to 2), `maxCrawlPages` (set to 5)
2. **Generate icebreakers** -> AI node (GPT-4o or Claude)
   - Pipe: `results[].text` -> prompt context per lead
   - Key input: company summary + lead name + role

### Output fields
Step 1: `text` (clean markdown), `metadata.title`, `metadata.description`, `url`
Step 2: AI-generated icebreaker string per lead

### Gotcha
Some Apollo exports include LinkedIn URLs instead of company websites. Filter the list for `http` URLs before passing to WCC - LinkedIn blocks crawlers.

---

## Reddit community lead mining
**When:** User wants to find prospects actively posting problems that their product or service solves in relevant subreddits.

### Pipeline
1. **Mine subreddit posts** -> `trudax/reddit-scraper-lite`
   - Key input: `startUrls` (subreddit URLs), `searchTerms` (problem keywords), `maxItems`, `sort` (hot/new/top)
2. **Qualify leads** -> AI node
   - Pipe: `results[].title`, `results[].body` -> qualification prompt
   - Key input: ICP criteria, pain point keywords

### Output fields
Step 1: `title`, `body`, `subreddit`, `url`, `score`, `numberOfComments`, `createdAt`, `author`
Step 2: AI qualification score, extracted contact intent, suggested outreach angle

### Gotcha
Reddit usernames are pseudonymous - there is no direct email enrichment path. The output is intent signals and post URLs for manual outreach via Reddit DM or to cross-reference against other platforms.
