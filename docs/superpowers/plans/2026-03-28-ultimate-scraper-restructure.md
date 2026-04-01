# Ultimate Scraper Skill Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the ultimate-scraper skill from a monolithic 400-line index into a three-layer progressive disclosure architecture: lean Actor lookup + rich use-case workflow guides + dynamic schema fetching.

**Architecture:** Flat Markdown index (~100 lines) for Actor selection, 10 use-case workflow guides with explicit data-piping instructions, cross-cutting gotchas/cost guardrails file. Input schemas fetched dynamically via CLI at runtime.

**Tech Stack:** Markdown (all files), Apify CLI v1.4.0+ (runtime commands)

---

### Task 1: Create lean actor-index.md

**Files:**
- Create: `skills/apify-ultimate-scraper/references/actor-index.md`

- [ ] **Step 1: Write the lean Actor index**

Delete the existing `references/actor-index.md` (~400 lines) and replace it with the lean version below. Three columns only: `Actor | Tier | Best for`. No descriptions longer than 5 words. No workflows (those move to workflow guides). Organized by platform.

```markdown
# Actor index

Flat lookup for Actor selection. For input schemas, fetch dynamically:
`apify actors info "ACTOR_ID" --input --json`

Tiers: `apify` = Apify-maintained (always prefer), `community` = community-maintained (fill gaps).

## Instagram

| Actor | Tier | Best for |
|-------|------|----------|
| apify/instagram-scraper | apify | all Instagram data |
| apify/instagram-profile-scraper | apify | profiles, followers, bio |
| apify/instagram-post-scraper | apify | posts, engagement metrics |
| apify/instagram-comment-scraper | apify | post and reel comments |
| apify/instagram-hashtag-scraper | apify | posts by hashtag |
| apify/instagram-hashtag-analytics-scraper | apify | hashtag metrics, trends |
| apify/instagram-reel-scraper | apify | reels, transcripts, engagement |
| apify/instagram-api-scraper | apify | API-based, no login |
| apify/instagram-search-scraper | apify | search users, places |
| apify/instagram-tagged-scraper | apify | tagged/mentioned posts |
| apify/instagram-topic-scraper | apify | posts by topic |
| apify/instagram-followers-count-scraper | apify | follower count tracking |
| apify/export-instagram-comments-posts | apify | bulk posts + comments |

## Facebook

| Actor | Tier | Best for |
|-------|------|----------|
| apify/facebook-posts-scraper | apify | posts, videos, engagement |
| apify/facebook-comments-scraper | apify | comment extraction |
| apify/facebook-likes-scraper | apify | reactions, liker info |
| apify/facebook-groups-scraper | apify | public group content |
| apify/facebook-events-scraper | apify | events, attendees |
| apify/facebook-reels-scraper | apify | reels, engagement |
| apify/facebook-photos-scraper | apify | photos with OCR |
| apify/facebook-search-scraper | apify | page search |
| apify/facebook-marketplace-scraper | apify | marketplace listings |
| apify/facebook-followers-following-scraper | apify | follower lists |
| apify/facebook-video-search-scraper | apify | video search |
| apify/facebook-ads-scraper | apify | ad library, creatives |
| apify/facebook-page-contact-information | apify | page contact info |
| apify/facebook-reviews-scraper | apify | page reviews |
| apify/facebook-hashtag-scraper | apify | hashtag posts |
| apify/threads-profile-api-scraper | apify | Threads profiles |

## TikTok

| Actor | Tier | Best for |
|-------|------|----------|
| clockworks/tiktok-scraper | apify | all TikTok data |
| clockworks/tiktok-profile-scraper | apify | profiles, videos |
| clockworks/tiktok-video-scraper | apify | video details, metrics |
| clockworks/tiktok-comments-scraper | apify | video comments |
| clockworks/tiktok-hashtag-scraper | apify | videos by hashtag |
| clockworks/tiktok-followers-scraper | apify | follower profiles |
| clockworks/tiktok-user-search-scraper | apify | user search |
| clockworks/tiktok-sound-scraper | apify | videos by sound |
| clockworks/free-tiktok-scraper | apify | free tier extraction |
| clockworks/tiktok-ads-scraper | apify | hashtag analytics |
| clockworks/tiktok-trends-scraper | apify | trending content |
| clockworks/tiktok-explore-scraper | apify | explore categories |
| clockworks/tiktok-discover-scraper | apify | discover by hashtag |

## YouTube

| Actor | Tier | Best for |
|-------|------|----------|
| streamers/youtube-scraper | apify | videos, metrics |
| streamers/youtube-channel-scraper | apify | channel info |
| streamers/youtube-comments-scraper | apify | video comments |
| streamers/youtube-shorts-scraper | apify | shorts data |
| streamers/youtube-video-scraper-by-hashtag | apify | videos by hashtag |
| streamers/youtube-video-downloader | apify | video download |
| curious_coder/youtube-transcript-scraper | community | transcripts, captions |

## X/Twitter

| Actor | Tier | Best for |
|-------|------|----------|
| apidojo/tweet-scraper | community | tweet search |
| apidojo/twitter-scraper-lite | community | comprehensive, no limits |
| apidojo/twitter-user-scraper | community | user profiles |
| apidojo/twitter-profile-scraper | community | profiles + recent tweets |
| apidojo/twitter-list-scraper | community | tweets from lists |

## LinkedIn

| Actor | Tier | Best for |
|-------|------|----------|
| harvestapi/linkedin-profile-search | community | find profiles |
| harvestapi/linkedin-profile-scraper | community | profile with email |
| harvestapi/linkedin-company | community | company details |
| harvestapi/linkedin-company-employees | community | employee lists |
| harvestapi/linkedin-company-posts | community | company page posts |
| harvestapi/linkedin-profile-posts | community | profile posts |
| harvestapi/linkedin-job-search | community | job listings |
| harvestapi/linkedin-post-search | community | post search |
| harvestapi/linkedin-post-comments | community | post comments |
| harvestapi/linkedin-profile-search-by-name | community | find by name |
| harvestapi/linkedin-profile-search-by-services | community | find by service |
| apimaestro/linkedin-companies-search-scraper | community | company search |
| apimaestro/linkedin-company-detail | community | company deep data |
| apimaestro/linkedin-jobs-scraper-api | community | job search |
| apimaestro/linkedin-job-detail | community | job details |
| apimaestro/linkedin-batch-profile-posts-scraper | community | batch profile posts |
| apimaestro/linkedin-post-reshares | community | post reshares |
| apimaestro/linkedin-post-detail | community | post details |
| apimaestro/linkedin-profile-full-sections-scraper | community | full profile data |
| dev_fusion/linkedin-profile-scraper | community | mass scraping + email |

## Google Maps

| Actor | Tier | Best for |
|-------|------|----------|
| compass/crawler-google-places | apify | business listings |
| compass/google-maps-extractor | apify | detailed business data |
| compass/Google-Maps-Reviews-Scraper | apify | reviews, ratings |
| compass/enrich-google-maps-dataset-with-contacts | apify | email enrichment |
| compass/contact-details-scraper-standby | apify | quick contact extract |
| lukaskrivka/google-maps-with-contact-details | community | listings + contacts |
| curious_coder/google-maps-reviews-scraper | community | cheap review scraping |

## Google Search and Trends

| Actor | Tier | Best for |
|-------|------|----------|
| apify/google-search-scraper | apify | SERP, ads, AI overviews |
| apify/google-trends-scraper | apify | trend data |
| tri_angle/bing-search-scraper | apify | Bing SERP data |

## Reviews (cross-platform)

| Actor | Tier | Best for |
|-------|------|----------|
| tri_angle/hotel-review-aggregator | apify | 7-platform hotel reviews |
| tri_angle/restaurant-review-aggregator | apify | 6-platform restaurant reviews |
| tri_angle/yelp-scraper | apify | Yelp business data |
| tri_angle/yelp-review-scraper | apify | Yelp reviews |
| tri_angle/get-tripadvisor-urls | apify | find TripAdvisor URLs |
| tri_angle/get-yelp-urls | apify | find Yelp URLs |
| tri_angle/airbnb-reviews-scraper | apify | Airbnb reviews |
| tri_angle/social-media-sentiment-analysis-tool | apify | sentiment analysis |

## Real estate and hospitality

| Actor | Tier | Best for |
|-------|------|----------|
| tri_angle/airbnb-scraper | apify | Airbnb listings |
| tri_angle/new-fast-airbnb-scraper | apify | fast Airbnb search |
| tri_angle/airbnb-rooms-urls-scraper | apify | detailed room data |
| tri_angle/redfin-search | apify | Redfin property search |
| tri_angle/redfin-detail | apify | Redfin property details |
| tri_angle/real-estate-aggregator | apify | multi-source listings |
| tri_angle/fast-zoopla-properties-scraper | apify | UK properties |
| tri_angle/doordash-store-details-scraper | apify | DoorDash stores |
| tri_angle/cargurus-zipcode-search-scraper | apify | CarGurus listings |
| tri_angle/carmax-zipcode-search-scraper | apify | Carmax listings |

## SEO tools

| Actor | Tier | Best for |
|-------|------|----------|
| radeance/similarweb-scraper | community | traffic, rankings |
| radeance/ahrefs-scraper | community | backlinks, keywords |
| radeance/semrush-scraper | community | domain authority |
| radeance/moz-scraper | community | DA, spam score |
| radeance/ubersuggest-scraper | community | keyword suggestions |
| radeance/se-ranking-scraper | community | keyword CPC |

## Content and web crawling

| Actor | Tier | Best for |
|-------|------|----------|
| apify/website-content-crawler | apify | clean text for AI |
| apify/rag-web-browser | apify | RAG pipelines |
| apify/web-scraper | apify | general web scraping |
| apify/cheerio-scraper | apify | fast HTML parsing |
| apify/playwright-scraper | apify | JS-heavy sites |
| apify/camoufox-scraper | apify | anti-bot sites |
| apify/sitemap-extractor | apify | sitemap URLs |
| lukaskrivka/article-extractor-smart | community | article extraction |

## Other platforms

| Actor | Tier | Best for |
|-------|------|----------|
| tri_angle/telegram-scraper | apify | Telegram messages |
| tri_angle/snapchat-scraper | apify | Snapchat profiles |
| tri_angle/snapchat-spotlight-scraper | apify | Snapchat Spotlight |
| tri_angle/truth-scraper | apify | Truth Social |
| tri_angle/social-media-finder | apify | cross-platform search |
| tri_angle/website-changes-detector | apify | website monitoring |
| tri_angle/e-commerce-product-matching-tool | apify | product matching |
| trudax/reddit-scraper-lite | community | Reddit posts |
| janbuchar/github-contributors-scraper | community | GitHub contributors |

## Enrichment and contacts

| Actor | Tier | Best for |
|-------|------|----------|
| apify/social-media-leads-analyzer | apify | emails from websites |
| apify/social-media-hashtag-research | apify | cross-platform hashtags |
| apify/e-commerce-scraping-tool | apify | product data enrichment |
| vdrmota/contact-info-scraper | community | contact extraction |
| code_crafter/leads-finder | community | B2B leads |
```

- [ ] **Step 2: Verify the index is under 100 Actor entries per platform section**

Count the entries visually. The index should have ~100 unique Actor IDs total across all platform sections. Some Actors appear in multiple use-case workflow guides but should appear only once in the index, under their primary platform.

- [ ] **Step 3: Commit**

```bash
git add skills/apify-ultimate-scraper/references/actor-index.md
git commit -m "refactor: replace monolithic actor index with lean platform-organized lookup"
```

---

### Task 2: Create gotchas.md

**Files:**
- Create: `skills/apify-ultimate-scraper/references/gotchas.md`

- [ ] **Step 1: Write the gotchas and cost guardrails file**

```markdown
# Gotchas and cost guardrails

## Pricing models

| Model | How it works | Action before running |
|-------|-------------|----------------------|
| FREE | No per-result cost, only platform compute | None needed |
| PAY_PER_EVENT (PPE) | Charged per result item | MUST estimate cost first |
| FLAT_PRICE_PER_MONTH | Monthly subscription | Verify user has active subscription |

To check an Actor's pricing:

    apify actors info "ACTOR_ID" --json

Read `.currentPricingInfo.pricingModel` and `.currentPricingInfo.pricePerEvent`.

## Cost estimation protocol

Before running any PPE Actor:

1. Get the per-event price from Actor info (`.currentPricingInfo.pricePerEvent`)
2. Multiply by the requested result count
3. Present the estimate to the user: "This will cost approximately $X for Y results"
4. If estimate > $5: warn explicitly
5. If estimate > $20: require explicit user confirmation before proceeding

## Common pitfalls

**Cookie-dependent Actors**
Some social media scrapers require cookies or login sessions. If an Actor returns auth errors or empty results unexpectedly, check its README:

    apify actors info "ACTOR_ID" --readme

Look for mentions of "cookies", "login", "session", or "proxy".

**Rate limiting on large scrapes**
Platforms throttle or block large-volume scraping. Mitigations:
- Use proxy configuration when available: `"proxyConfiguration": {"useApifyProxy": true}`
- Set reasonable concurrency limits (check the Actor's `maxConcurrency` input)
- For 1,000+ results, suggest splitting into smaller batches

**Empty results**
Common causes:
- Too-narrow search query or geo-restriction (try broader terms)
- Platform blocking without proxy (enable Apify Proxy)
- Actor requires cookies/login but none provided
- Wrong input field name (always verify with `--input --json`)

**maxResults vs maxCrawledPages**
Different Actors use different limit field names. Common variants:
- `maxResults`, `resultsLimit`, `maxItems` - limit output items
- `maxCrawledPages`, `maxRequestsPerCrawl` - limit pages visited
Always fetch the input schema to find the correct field for the specific Actor.

**Deprecated Actors**
Check `.isDeprecated` in `apify actors info --json`. If `true`:
1. Search for alternatives: `apify actors search "SIMILAR_KEYWORDS" --json`
2. Prefer `apify` tier replacements over `community` alternatives

**LinkedIn pricing**
LinkedIn Actors are all PPE and vary significantly:
- `harvestapi/` Actors: generally cheaper ($0.001-0.01/result)
- `apimaestro/` Actors: generally more expensive ($0.005-0.02/result)
- `dev_fusion/` Actors: mid-range, useful for mass scraping with email enrichment
Always compare pricing before selecting a LinkedIn Actor.

**SEO tool pricing**
`radeance/` SEO scrapers (SimilarWeb, Ahrefs, SEMrush, Moz) have the highest per-result costs ($0.005-0.0275/result). For large-scale SEO analysis, estimate costs carefully and suggest batching.
```

- [ ] **Step 2: Commit**

```bash
git add skills/apify-ultimate-scraper/references/gotchas.md
git commit -m "feat: add gotchas and cost guardrails reference"
```

---

### Task 3: Create workflow guides (batch 1 of 2)

**Files:**
- Create: `skills/apify-ultimate-scraper/references/workflows/lead-generation.md`
- Create: `skills/apify-ultimate-scraper/references/workflows/competitive-intel.md`
- Create: `skills/apify-ultimate-scraper/references/workflows/influencer-vetting.md`
- Create: `skills/apify-ultimate-scraper/references/workflows/brand-monitoring.md`
- Create: `skills/apify-ultimate-scraper/references/workflows/review-analysis.md`

- [ ] **Step 1: Create the workflows directory**

```bash
mkdir -p skills/apify-ultimate-scraper/references/workflows
```

- [ ] **Step 2: Write lead-generation.md**

```markdown
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

### Gotcha
LinkedIn Actors are all PPE. Step 2 with `includeEmail: true` costs ~$0.01/profile. For 500 profiles, that's ~$5. Estimate and confirm with user.
```

- [ ] **Step 3: Write competitive-intel.md**

```markdown
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

### Gotcha
SEO scrapers (radeance/) have the highest PPE costs ($0.005-0.0275/result). Estimate cost before running. For a single domain, each step costs ~$0.02-0.03.
```

- [ ] **Step 4: Write influencer-vetting.md**

```markdown
# Influencer vetting workflows

## Instagram creator vetting
**When:** User wants to evaluate an influencer's profile, audience, and engagement quality.

### Pipeline
1. **Get profile data** -> `apify/instagram-profile-scraper`
   - Key input: `usernames` (list of handles)
2. **Analyze engagement** -> `apify/instagram-comment-scraper`
   - Pipe: `results[].latestPosts[].url` -> `directUrls` (pick 3-5 recent posts)
   - Key input: `directUrls`, `resultsLimit`

### Output fields
Step 1: `username`, `fullName`, `followersCount`, `followsCount`, `postsCount`, `biography`, `isVerified`, `latestPosts[]`
Step 2: `text`, `ownerUsername`, `timestamp` (scan for bot patterns: generic praise, emoji-only, irrelevant content)

### Gotcha
High follower count with low comment quality suggests fake followers. Compare comment sentiment to post content.

## Cross-platform influencer discovery
**When:** User wants to find an influencer's presence across multiple platforms.

### Pipeline
1. **Search across platforms** -> `tri_angle/social-media-finder`
   - Key input: `query` (influencer name or handle), `platforms`

### Output fields
Step 1: `platform`, `profileUrl`, `username`, `followers`, `isVerified`
```

- [ ] **Step 5: Write brand-monitoring.md**

```markdown
# Brand monitoring workflows

## Cross-platform brand mention tracking
**When:** User wants to monitor brand mentions, hashtags, or sentiment across social platforms.

### Pipeline (run each independently, combine results)
1. **Instagram mentions** -> `apify/instagram-tagged-scraper`
   - Key input: `username` (brand handle)
2. **Instagram hashtags** -> `apify/instagram-hashtag-scraper`
   - Key input: `hashtags` (branded hashtags)
3. **X/Twitter mentions** -> `apidojo/tweet-scraper`
   - Key input: `searchTerms` (brand name, handle, hashtags)
4. **Reddit mentions** -> `trudax/reddit-scraper-lite`
   - Key input: `searchQuery` (brand name)

### Output fields
Instagram: `caption`, `likesCount`, `commentsCount`, `timestamp`, `ownerUsername`
X/Twitter: `text`, `retweetCount`, `likeCount`, `replyCount`, `createdAt`, `author`
Reddit: `title`, `body`, `score`, `numComments`, `subreddit`, `createdAt`

### Gotcha
This is a parallel workflow, not sequential. Run each Actor independently. Combine results by date for a timeline view.

## Sentiment analysis
**When:** User wants sentiment scoring on collected mentions.

### Pipeline
1. **Collect mentions** (use any step from above)
2. **Analyze sentiment** -> `tri_angle/social-media-sentiment-analysis-tool`
   - Pipe: collected post URLs -> `urls`
   - Key input: `urls`, `platforms`

### Output fields
Step 2: `sentiment` (positive/negative/neutral), `score`, `text`, `platform`
```

- [ ] **Step 6: Write review-analysis.md**

```markdown
# Review analysis workflows

## Google Maps review extraction
**When:** User wants to collect and analyze business reviews from Google Maps.

### Pipeline
1. **Find businesses** -> `compass/crawler-google-places`
   - Key input: `searchStringsArray`, `locationQuery`, `maxCrawledPlaces`
2. **Extract reviews** -> `compass/Google-Maps-Reviews-Scraper`
   - Pipe: `results[].url` -> `startUrls`
   - Key input: `startUrls`, `maxReviews`

### Output fields
Step 1: `title`, `totalScore`, `reviewsCount`, `url`, `categoryName`
Step 2: `text`, `stars`, `publishedAtDate`, `reviewerName`, `ownerResponse`

## Cross-platform hotel/restaurant reviews
**When:** User wants reviews aggregated from multiple platforms for the same business.

### Pipeline (hotels)
1. **Aggregate reviews** -> `tri_angle/hotel-review-aggregator`
   - Key input: `urls` (hotel URLs from TripAdvisor, Yelp, Google Maps, Booking.com, etc.)

### Pipeline (restaurants)
1. **Aggregate reviews** -> `tri_angle/restaurant-review-aggregator`
   - Key input: `urls` (restaurant URLs from Yelp, Google Maps, DoorDash, UberEats, etc.)

### Output fields
Both: `text`, `rating`, `date`, `platform`, `reviewerName`, `title`

## Yelp review pipeline
**When:** User wants Yelp reviews for businesses in a specific area.

### Pipeline
1. **Find businesses** -> `tri_angle/get-yelp-urls`
   - Key input: `location`, `category`
2. **Extract reviews** -> `tri_angle/yelp-review-scraper`
   - Pipe: `results[].url` -> `startUrls`
   - Key input: `startUrls`, `maxReviews`

### Output fields
Step 1: `name`, `url`, `rating`, `reviewCount`, `address`
Step 2: `text`, `rating`, `date`, `userName`

### Gotcha
Review aggregators pull from multiple platforms in one run - cheaper than running separate scrapers per platform. Use the aggregators when covering 3+ platforms.
```

- [ ] **Step 7: Commit**

```bash
git add skills/apify-ultimate-scraper/references/workflows/
git commit -m "feat: add workflow guides for lead-gen, competitive-intel, influencer, brand, reviews"
```

---

### Task 4: Create workflow guides (batch 2 of 2)

**Files:**
- Create: `skills/apify-ultimate-scraper/references/workflows/content-and-seo.md`
- Create: `skills/apify-ultimate-scraper/references/workflows/social-media-analytics.md`
- Create: `skills/apify-ultimate-scraper/references/workflows/trend-research.md`
- Create: `skills/apify-ultimate-scraper/references/workflows/job-market-and-recruitment.md`
- Create: `skills/apify-ultimate-scraper/references/workflows/real-estate-and-hospitality.md`

- [ ] **Step 1: Write content-and-seo.md**

```markdown
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

## SERP analysis
**When:** User wants to analyze search engine results for specific keywords.

### Pipeline
1. **Google SERP** -> `apify/google-search-scraper`
   - Key input: `queries`, `maxPagesPerQuery`, `countryCode`, `languageCode`

### Output fields
Step 1: `organicResults[]` (title, url, description, position), `paidResults[]`, `peopleAlsoAsk[]`, `relatedSearches[]`

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

### Gotcha
All radeance/ SEO Actors are PPE at $0.005-0.0275/result. Running all 3 for one domain costs ~$0.05-0.08. For 50 domains, estimate $2.50-$4.00.
```

- [ ] **Step 2: Write social-media-analytics.md**

```markdown
# Social media analytics workflows

## Instagram account performance analysis
**When:** User wants engagement metrics and content performance for an Instagram account.

### Pipeline
1. **Get profile** -> `apify/instagram-profile-scraper`
   - Key input: `usernames`
2. **Get recent posts** -> `apify/instagram-post-scraper`
   - Key input: `directUrls` (from profile's `latestPosts[].url`) or `usernames`

### Output fields
Step 1: `followersCount`, `followsCount`, `postsCount`, `biography`, `isVerified`
Step 2: `caption`, `likesCount`, `commentsCount`, `timestamp`, `type` (photo/video/reel), `url`

## TikTok creator analytics
**When:** User wants performance data for a TikTok creator.

### Pipeline
1. **Get profile** -> `clockworks/tiktok-profile-scraper`
   - Key input: `profiles` (handles or URLs)

### Output fields
Step 1: `nickname`, `followers`, `following`, `likes`, `videos`, `verified`, `recentVideos[]` (with views, likes, shares per video)

## Multi-platform engagement comparison
**When:** User wants to compare an account's performance across platforms.

### Pipeline (run independently, combine)
1. **Instagram** -> `apify/instagram-profile-scraper` with `usernames`
2. **TikTok** -> `clockworks/tiktok-profile-scraper` with `profiles`
3. **YouTube** -> `streamers/youtube-channel-scraper` with `channelUrls`
4. **X/Twitter** -> `apidojo/twitter-user-scraper` with `handles`

### Output fields
Instagram: `followersCount`, `postsCount`, `biography`
TikTok: `followers`, `likes`, `videos`
YouTube: `subscriberCount`, `videoCount`, `viewCount`
X/Twitter: `followers`, `tweets`, `likes`

### Gotcha
Parallel workflow - run each Actor independently. Normalize metric names for comparison (followers/subscribers, posts/videos/tweets).
```

- [ ] **Step 3: Write trend-research.md**

```markdown
# Trend and keyword research workflows

## Google Trends analysis
**When:** User wants to analyze search demand trends for keywords or topics.

### Pipeline
1. **Get trend data** -> `apify/google-trends-scraper`
   - Key input: `searchTerms`, `timeRange`, `geo` (country code)

### Output fields
Step 1: `term`, `timelineData[]` (date, value), `relatedQueries[]`, `relatedTopics[]`

## Cross-platform hashtag research
**When:** User wants to evaluate a hashtag's reach and usage across platforms.

### Pipeline
1. **Cross-platform overview** -> `apify/social-media-hashtag-research`
   - Key input: `hashtags`, `platforms` (instagram, youtube, tiktok, facebook)

### Output fields
Step 1: `hashtag`, `platform`, `postsCount`, `topPosts[]`, `relatedHashtags[]`

## TikTok trend discovery
**When:** User wants to find trending content, sounds, or hashtags on TikTok.

### Pipeline
1. **Trending content** -> `clockworks/tiktok-trends-scraper`
   - Key input: `channel` (trending category)
2. **Explore categories** -> `clockworks/tiktok-explore-scraper`
   - Key input: `exploreCategories`

### Output fields
Step 1: `videoUrl`, `description`, `likes`, `shares`, `views`, `author`, `music`
Step 2: `category`, `posts[]`, `authors[]`, `music[]`

## Content topic validation
**When:** User wants to validate whether a topic has demand before creating content.

### Pipeline
1. **Search demand** -> `apify/google-trends-scraper`
   - Key input: `searchTerms` (topic keywords)
2. **Social reach** -> `apify/social-media-hashtag-research`
   - Key input: `hashtags` (topic hashtags)

### Output fields
Step 1: `timelineData[]` (trending up/down), `relatedQueries[]`
Step 2: `postsCount` per platform, `topPosts[]`

### Gotcha
Google Trends shows relative interest (0-100 scale), not absolute volume. Combine with hashtag post counts for a fuller picture.
```

- [ ] **Step 4: Write job-market-and-recruitment.md**

```markdown
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

## GitHub contributor discovery
**When:** User wants to find developers who contribute to specific open-source projects.

### Pipeline
1. **Get contributors** -> `janbuchar/github-contributors-scraper`
   - Key input: `repoUrls`

### Output fields
Step 1: `username`, `contributions`, `profileUrl`, `avatarUrl`
```

- [ ] **Step 5: Write real-estate-and-hospitality.md**

```markdown
# Real estate and hospitality workflows

## Property search and analysis
**When:** User wants to find and compare property listings in a specific area.

### Pipeline
1. **Search properties** -> `tri_angle/redfin-search`
   - Key input: `location`, `propertyType`, `minPrice`, `maxPrice`
2. **Get details** -> `tri_angle/redfin-detail`
   - Pipe: `results[].url` -> `startUrls`
   - Key input: `startUrls`

### Output fields
Step 1: `address`, `price`, `beds`, `baths`, `sqft`, `url`, `status`
Step 2: `description`, `yearBuilt`, `lotSize`, `priceHistory[]`, `taxHistory[]`, `schools[]`

## Airbnb market analysis
**When:** User wants to analyze Airbnb listings, pricing, and reviews in a destination.

### Pipeline
1. **Search listings** -> `tri_angle/new-fast-airbnb-scraper`
   - Key input: `location`, `checkIn`, `checkOut`, `maxItems`
2. **Get reviews** -> `tri_angle/airbnb-reviews-scraper`
   - Pipe: `results[].url` -> `startUrls`
   - Key input: `startUrls`, `maxReviews`

### Output fields
Step 1: `name`, `price`, `rating`, `reviews`, `type`, `amenities[]`, `url`, `images[]`
Step 2: `text`, `rating`, `date`, `reviewerName`

### Gotcha
Airbnb pricing varies by date. Always set `checkIn` and `checkOut` for accurate pricing. For market analysis, run multiple date ranges to capture seasonal variation.

## Multi-source property comparison
**When:** User wants to compare listings across Zillow, Realtor, Zumper, and other US/UK sources.

### Pipeline
1. **Aggregate listings** -> `tri_angle/real-estate-aggregator`
   - Key input: `location`, `propertyType`, `sources` (Zillow, Realtor, Zumper, Apartments.com, Rightmove)

### Output fields
Step 1: `address`, `price`, `beds`, `baths`, `sqft`, `source`, `url`, `listingDate`
```

- [ ] **Step 6: Commit**

```bash
git add skills/apify-ultimate-scraper/references/workflows/
git commit -m "feat: add workflow guides for content/SEO, social analytics, trends, jobs, real estate"
```

---

### Task 5: Rewrite SKILL.md with new routing logic

**Files:**
- Modify: `skills/apify-ultimate-scraper/SKILL.md`

- [ ] **Step 1: Rewrite the full SKILL.md**

Replace the entire file with the new version that uses the three-layer routing:

```markdown
---
name: apify-ultimate-scraper
description: Universal AI-powered web scraper for any platform. Scrape data from Instagram, Facebook, TikTok, YouTube, LinkedIn, X/Twitter, Google Maps, Google Search, Google Trends, Reddit, Airbnb, Yelp, and 15+ more platforms. Use for lead generation, brand monitoring, competitor analysis, influencer discovery, trend research, content analytics, audience analysis, review analysis, SEO intelligence, recruitment, or any data extraction task.
---

# Universal web scraper

AI-driven data extraction from ~100 Actors across 15+ platforms via the Apify CLI.

**Rule: Always pass `--json` to CLI commands.** JSON output is stable across CLI versions. Never parse human-readable output.

## Prerequisites

- Apify CLI v1.4.0+ (`npm install -g apify-cli`)
- Authenticated session (see below)

## Authentication

Check: `apify info`

If not logged in, authenticate via OAuth (opens browser):

    apify login

Headless fallback: `export APIFY_TOKEN=your_token_here`
Generate token: https://console.apify.com/settings/integrations

## Workflow

### Step 1: Understand goal and select Actor

Identify the target platform and use case. Read `references/actor-index.md` to find the right Actor.

If the task involves a multi-step pipeline, also read the matching workflow guide:

| Task involves... | Read |
|-----------------|------|
| leads, contacts, emails, B2B | `references/workflows/lead-generation.md` |
| competitor, ads, pricing | `references/workflows/competitive-intel.md` |
| influencer, creator | `references/workflows/influencer-vetting.md` |
| brand, mentions, sentiment | `references/workflows/brand-monitoring.md` |
| reviews, ratings, reputation | `references/workflows/review-analysis.md` |
| SEO, SERP, crawl, content, RAG | `references/workflows/content-and-seo.md` |
| analytics, engagement, performance | `references/workflows/social-media-analytics.md` |
| trends, keywords, hashtags | `references/workflows/trend-research.md` |
| jobs, recruiting, candidates | `references/workflows/job-market-and-recruitment.md` |
| real estate, listings, hotels | `references/workflows/real-estate-and-hospitality.md` |

If no Actor matches in the index, search dynamically:

    apify actors search "KEYWORDS" --json --limit 10

From results: `items[].username`/`items[].name` (Actor ID), `items[].title`, `items[].stats.totalUsers30Days`, `items[].currentPricingInfo.pricingModel`.

### Step 2: Fetch Actor schema and check gotchas

Fetch the input schema dynamically:

    apify actors info "ACTOR_ID" --input --json

Also read `references/gotchas.md` to check for pricing traps and common pitfalls for the selected Actor.

For PPE Actors: estimate cost before running (see gotchas.md cost estimation protocol).

For Actor documentation: `apify actors info "ACTOR_ID" --readme`

### Step 3: Configure and run

**Skip user preferences** for simple lookups (e.g., "Nike's follower count"). Go straight to running with quick answer mode.

For larger tasks, confirm output format (quick answer / CSV / JSON) and result count.

**Standard run (blocking):**

    apify actors call "ACTOR_ID" -i 'JSON_INPUT' --json

From output: `.id` (run ID), `.status`, `.defaultDatasetId`, `.stats.durationMillis`

**Fetch results:**

    apify datasets get-items DATASET_ID --format json

For CSV: `apify datasets get-items DATASET_ID --format csv`

**Quick answer mode:** Fetch results as JSON, pick top 5, present formatted in chat.

**Save to file:** Fetch results, use Write tool to save as `YYYY-MM-DD_descriptive-name.csv` or `.json`.

**Large/long-running scrapes:**

    apify actors start "ACTOR_ID" -i 'JSON_INPUT' --json

Poll: `apify runs info RUN_ID --json` (check `.status` for `SUCCEEDED`).

### Step 4: Deliver results

Report: result count, file location (if saved), key data fields, and links:
- Dataset: `https://console.apify.com/storage/datasets/DATASET_ID`
- Run: `https://console.apify.com/actors/runs/RUN_ID`

For multi-step workflows: suggest the next pipeline step from the workflow guide.

## Error handling

| Error | Resolution |
|-------|-----------|
| `apify: command not found` | `npm install -g apify-cli` |
| `Error: Not logged in` | `apify login` or `export APIFY_TOKEN=...` |
| Actor not found | Check ID format (`username/actor-name`); try `apify actors search` |
| `status: FAILED` | Check `.statusMessage`; see run log at Console URL |
| Takes too long | Switch to `apify actors start` + poll with `apify runs info` |
| Empty results | Lower limits; check Actor README with `apify actors info ACTOR_ID --readme` |
| `isDeprecated: true` | Search for alternatives with `apify actors search` |
```

- [ ] **Step 2: Verify SKILL.md is under 150 lines**

Count lines. Target: ~120-140 lines. If over 150, trim the error handling table or move to a reference file.

- [ ] **Step 3: Commit**

```bash
git add skills/apify-ultimate-scraper/SKILL.md
git commit -m "refactor: rewrite SKILL.md with three-layer progressive disclosure routing"
```

---

### Task 6: Clean up and verify

**Files:**
- Modify: `.claude-plugin/marketplace.json` (update description)
- Regenerate: `agents/AGENTS.md`

- [ ] **Step 1: Update marketplace.json description**

Update the `apify-ultimate-scraper` entry's description to reflect the restructured skill. The current description already mentions 15+ platforms; no major change needed. Verify it matches the SKILL.md frontmatter description.

- [ ] **Step 2: Regenerate AGENTS.md**

```bash
cd /tmp/agent-skills && python3 scripts/generate_agents.py
```

- [ ] **Step 3: Verify file structure**

```bash
find skills/apify-ultimate-scraper -type f | sort
```

Expected output:
```
skills/apify-ultimate-scraper/SKILL.md
skills/apify-ultimate-scraper/references/actor-index.md
skills/apify-ultimate-scraper/references/gotchas.md
skills/apify-ultimate-scraper/references/workflows/brand-monitoring.md
skills/apify-ultimate-scraper/references/workflows/competitive-intel.md
skills/apify-ultimate-scraper/references/workflows/content-and-seo.md
skills/apify-ultimate-scraper/references/workflows/influencer-vetting.md
skills/apify-ultimate-scraper/references/workflows/job-market-and-recruitment.md
skills/apify-ultimate-scraper/references/workflows/lead-generation.md
skills/apify-ultimate-scraper/references/workflows/real-estate-and-hospitality.md
skills/apify-ultimate-scraper/references/workflows/review-analysis.md
skills/apify-ultimate-scraper/references/workflows/social-media-analytics.md
skills/apify-ultimate-scraper/references/workflows/trend-research.md
```

13 files total. No leftover `reference/scripts/` directory.

- [ ] **Step 4: Commit and tag**

```bash
git add -A
git commit -m "chore: update marketplace description and regenerate AGENTS.md"
```

- [ ] **Step 5: End-to-end verification**

Test these scenarios mentally (or in Claude Code if available):

1. **Simple scrape** ("get Nike's Instagram profiles"): Agent loads SKILL.md + actor-index.md. Picks `apify/instagram-profile-scraper`. Fetches schema via `apify actors info --input --json`. Runs. ~250 lines loaded.

2. **Multi-step workflow** ("build a lead list of restaurants in Prague with emails"): Agent loads SKILL.md + actor-index.md + lead-generation.md + gotchas.md. Follows the "Local business leads" pipeline. ~370 lines loaded.

3. **PPE cost check** ("scrape LinkedIn profiles for 500 marketing managers"): Agent loads gotchas.md, sees LinkedIn pricing section, estimates cost (~$5), warns user before running.

4. **Dynamic discovery** ("scrape Glassdoor reviews"): Agent can't find in index, uses `apify actors search "glassdoor reviews" --json`, selects best match, fetches schema dynamically.
