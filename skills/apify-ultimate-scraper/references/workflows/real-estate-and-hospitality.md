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

## Real estate lead scoring and agent routing
**When:** User wants to qualify inbound leads from listing portals by budget signals and urgency, then route them to the right agent.

### Pipeline
1. **Search matching properties** -> `tri_angle/redfin-search`
   - Key input: `location`, `minPrice`, `maxPrice` (from lead payload)
2. **Enrich lead with LinkedIn signals** -> `harvestapi/linkedin-profile-scraper`
   - Key input: `profileUrls` (optional - use only when lead email resolves to a LinkedIn profile)

### Output fields
Step 1: `address`, `price`, `beds`, `baths`, `status`, `url`
Step 2: `headline`, `currentCompany`, `experience[]` (income/seniority signals)

### Gotcha
The LinkedIn enrichment step is optional - only run it when the lead's identity is known and a LinkedIn profile URL is available. The core routing logic (hot/warm/cold tier + agent assignment) runs on the MLS webhook payload itself, with scraping used as enrichment. Lead scoring and routing output fields are AI-generated: `leadTier`, `assignedAgent`, `routingReason`.

## Construction and pre-market property discovery
**When:** User wants to find new-construction projects or pre-market inventory before they appear on major listing portals.

### Pipeline
1. **Scrape construction portals** -> `apify/playwright-scraper`
   - Key input: `startUrls` (local MLS or construction project portal URLs), `proxyConfiguration`
2. **Extract clean text** -> `lukaskrivka/article-extractor-smart`
   - Pipe: `results[].url` -> `urls`

### Output fields
Step 1: raw HTML / structured page data
Step 2: `projectName`, `price`, `location`, `possessionDate`, `constructionStatus`

### Gotcha
No market-specific Actor exists for most construction portals (e.g., 99acres). Run `apify actors search "real estate"` to check for community-built options before using `apify/playwright-scraper`. For JS-heavy portals, `playwright-scraper` is required. Step 2 cleans raw output into structured fields - pipe all Step 1 URLs through it.

## Multi-source property comparison
**When:** User wants to compare listings across Zillow, Realtor, Zumper, and other US/UK sources.

### Pipeline
1. **Aggregate listings** -> `tri_angle/real-estate-aggregator`
   - Key input: `location`, `propertyType`, `sources` (Zillow, Realtor, Zumper, Apartments.com, Rightmove)

### Output fields
Step 1: `address`, `price`, `beds`, `baths`, `sqft`, `source`, `url`, `listingDate`
