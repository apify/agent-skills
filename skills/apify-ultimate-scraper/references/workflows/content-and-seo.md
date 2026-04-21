# Content and SEO workflows

## Website content extraction for RAG
**When:** User wants to crawl a website and extract clean text for AI/LLM pipelines or knowledge bases.

### Pipeline
1. **Crawl website** -> `apify/website-content-crawler`
   - Key input: `startUrls`, `maxCrawlPages`, `crawlerType` ("cheerio" for speed, "playwright" for JS sites)

### Output fields
Step 1: `url`, `title`, `text`, `markdown`, `metadata`, `links[]`

### Gotcha
For JS-heavy sites (SPAs), set `crawlerType: "playwright"`. For static sites, use `"cheerio"` (10x faster). For anti-bot sites, use `apify/camoufox-scraper` instead.

## SERP-based SEO content brief generation
**When:** User wants to generate a content brief for a target keyword by analyzing competitor SERP results and heading structures.

### Pipeline
1. **SERP scrape** -> `apify/google-search-scraper`
   - Key input: `queries`, `countryCode`, `maxResultsPerPage`
2. **Extract heading structure** -> `apify/cheerio-scraper`
   - Pipe: `results[].organicResults[].url` -> `startUrls` (filter non-article URLs first)
   - Key input: `startUrls`, `pageFunction` (extract h1/h2/h3 nodes)

### Output fields
Step 1: `organicResults[].url`, `organicResults[].title`, `organicResults[].snippet`
Step 2: heading structure (h1/h2/h3 text), word count per page

### Gotcha
Use `apify/cheerio-scraper` for heading extraction - it's 10x faster than `website-content-crawler` for HTML-only pages. Only escalate to `website-content-crawler` when you need full body text for AI synthesis.

## Sitemap content audit
**When:** User wants to crawl all URLs on a competitor's site from the sitemap and build a keyword and topic inventory.

### Pipeline
1. **Extract sitemap URLs** -> `apify/sitemap-extractor`
   - Key input: `startUrls` (sitemap.xml URL)
2. **Crawl each URL** -> `apify/website-content-crawler`
   - Pipe: `results[].urls[]` -> `startUrls`
   - Key input: `startUrls`, `maxCrawlPages`, `htmlTransformer` (readableText)

### Output fields
Step 1: `urls[]` (all discovered page URLs)
Step 2: `text`, `metadata`, `url`

### Gotcha
Large sitemaps (1,000+ URLs) can be expensive. Filter step 1 results to a specific path prefix (e.g., `/blog/`) before passing to step 2 to avoid crawling low-value pages like tag archives and pagination.

## Keyword rank tracking with alerts
**When:** User wants weekly tracking of keyword positions for own domain and competitors, with Slack alerts on drops over 5 positions.

### Pipeline
1. **SERP scrape** -> `apify/google-search-scraper`
   - Key input: `queries` (tracked keywords array), `countryCode`, `device` (desktop/mobile), `maxResultsPerPage` (set to 100)

### Output fields
Step 1: `organicResults[].position`, `organicResults[].url`, `organicResults[].domain`

### Cost estimate
`apify/google-search-scraper` is a fixed-cost Actor. 100 keywords weekly ≈ $1-3/month depending on query volume.

### Gotcha
Set `maxResultsPerPage: 100` to capture positions 11-100. Default is 10 results, which misses any keyword ranking outside page 1 - making it impossible to detect rank drops from position 12 to 18.

## SERP analysis
**When:** User wants to analyze search engine results for specific keywords.

### Pipeline
1. **Google SERP** -> `apify/google-search-scraper`
   - Key input: `queries`, `maxPagesPerQuery`, `countryCode`, `languageCode`

### Output fields
Step 1: `organicResults[]` (title, url, description, position), `paidResults[]`, `peopleAlsoAsk[]`, `relatedSearches[]`

## Deep research agent
**When:** User wants an AI agent that takes a research question, generates search queries, crawls top results, and synthesizes findings into a structured report.

### Pipeline
1. **Generate search queries** (LLM node - 3 queries per research question)
2. **SERP scrape** -> `apify/google-search-scraper`
   - Pipe: generated queries -> `queries`
   - Key input: `queries`, `maxResultsPerPage`
3. **Extract content** -> `apify/rag-web-browser`
   - Pipe: `results[].organicResults[].url` (AI-selected relevant URLs) -> `query`
   - Key input: `query`, `maxResults`, `requestTimeoutSecs`
4. **Synthesize** (LLM node - final report generation)

### Output fields
Step 2: `organicResults[].url`, `organicResults[].snippet`
Step 3: `text`, `url`, `metadata.title`

### Gotcha
Use `apify/rag-web-browser` at step 3 rather than `website-content-crawler` - it's optimized for agent-based single-URL retrieval and returns clean markdown with lower latency. Reserve `website-content-crawler` for bulk batch crawls.

## Domain authority and backlink analysis
**When:** User wants SEO metrics for specific domains.

### Pipeline
1. **Traffic overview** -> `radeance/similarweb-scraper`
   - Key input: `urls`
2. **Backlink profile** -> `radeance/ahrefs-scraper`
   - Key input: `urls`
3. **Domain authority** -> `radeance/semrush-scraper`
   - Key input: `urls`

### Output fields
Step 1: `globalRank`, `monthlyVisits`, `bounceRate`, `trafficSources`
Step 2: `domainRating`, `backlinks`, `referringDomains`, `organicKeywords`
Step 3: `authorityScore`, `organicSearchTraffic`, `paidSearchTraffic`

### Cost estimate
All radeance/ SEO Actors are PPE at $0.005-0.0275/result. Running all 3 for one domain costs ~$0.05-0.08. For 50 domains, estimate $2.50-$4.00.
