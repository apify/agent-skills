# Competitive intelligence workflows

## Competitor ad monitoring
**When:** User wants to see competitor advertising creatives, targeting, or ad spend signals.

### Pipeline
1. **Scrape ad library** -> `apify/facebook-ads-scraper`
   - Key input: `searchQuery` (competitor name), `country`, `adType`, `maxItems`

### Output fields
Step 1: `adTitle`, `adBody`, `adCreativeUrl`, `startDate`, `pageInfo.name`, `platform`

### Gotcha
Facebook Ad Library is public data, no auth needed. But results are limited to currently active or recently inactive ads.

---

## Competitor web presence analysis
**When:** User wants traffic, rankings, and SEO data for competitor domains.

### Pipeline
1. **Get traffic data** -> `radeance/similarweb-scraper`
   - Key input: `urls` (competitor domains)
2. **Get backlink profile** -> `radeance/ahrefs-scraper`
   - Key input: `urls` (same domains)

### Output fields
Step 1: `globalRank`, `monthlyVisits`, `bounceRate`, `avgVisitDuration`, `trafficSources`
Step 2: `domainRating`, `backlinks`, `referringDomains`, `organicKeywords`

### Cost estimate
radeance/ Actors cost $0.005-0.0275/result. A single domain audit across both steps costs ~$0.04-0.06.

---

## Competitor website change detection
**When:** User wants to monitor competitor pricing pages, feature announcements, or product pages and get alerted when meaningful changes occur.

### Pipeline
1. **Detect changes** -> `tri_angle/website-changes-detector`
   - Key input: `startUrls` (competitor page URLs), `notificationEmail`, `checkIntervalHours`

### Output fields
Step 1: `url`, `changedAt`, `diff` (text diff), `screenshotUrl`

### Gotcha
`tri_angle/website-changes-detector` handles baseline storage internally - do not attempt to manage baselines externally or you will lose the diff history between runs.

---

## Competitor SERP position monitoring
**When:** User wants to track where competitor domains rank for target keywords and get alerted on significant position shifts.

### Pipeline
1. **Scrape SERP rankings** -> `apify/google-search-scraper`
   - Key input: `queries` (target keywords array), `countryCode`, `maxResultsPerPage`
2. **Track traffic estimates** -> `radeance/similarweb-scraper`
   - Key input: `urls` (competitor domains)
   - Pipe: run separately per competitor domain after extracting domains from step 1 results

### Output fields
Step 1: `organicResults[].url`, `organicResults[].position`, `organicResults[].title`
Step 2: `globalRank`, `monthlyVisits`, `trafficSources`

### Cost estimate
`radeance/similarweb-scraper` costs ~$0.02-0.03 per domain. For 5 competitors, budget ~$0.10-0.15 per weekly run.

---

## Competitor feature and pricing benchmarking
**When:** User wants a structured comparison of competitor pricing tiers, feature lists, and positioning across 5-10 competitor sites.

### Pipeline
1. **Crawl pricing and feature pages** -> `apify/website-content-crawler`
   - Key input: `startUrls` (competitor pricing page URLs), `maxCrawlDepth` (set to 1), `includeUrlGlobs`
2. **Extract structured data** -> AI node (GPT-4o or Claude)
   - Pipe: `results[].text` -> extraction prompt per competitor
   - Key input: extraction schema (tiers, prices, key features, positioning statement)

### Output fields
Step 1: `text` (clean markdown with pricing tables), `url`, `metadata.title`
Step 2: AI-extracted structured JSON with tiers, prices, feature flags per competitor

### Gotcha
Set `maxCrawlDepth: 1` and use `includeUrlGlobs` to restrict crawl to pricing and features paths only. Without this, WCC will crawl the full site and inflate cost significantly.
