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

## Competitor review intelligence
**When:** User wants to extract competitor reviews to surface customer pain points and compare against own product strengths for positioning.

### Pipeline
1. **Scrape competitor reviews** -> `compass/Google-Maps-Reviews-Scraper`
   - Key input: `startUrls` (competitor Google Maps URLs), `maxReviews`, `sort` (newest or most relevant)
2. **Yelp competitor reviews** -> `tri_angle/yelp-review-scraper`
   - Key input: `startUrls` (competitor Yelp URLs), `maxReviews`

### Output fields
Step 1: `stars`, `text`, `name`, `publishedAtDate`, `reviewId`
Step 2: `text`, `rating`, `date`, `userName`

### Gotcha
Run steps 1 and 2 in parallel for the same competitor, then merge by date. AI analysis works best when you label each review with the competitor name before passing to LLM for theme extraction.

## Google Play app review monitoring
**When:** User wants daily low-rating alerts from Google Play to route urgent negative feedback to the support team.

### Pipeline
1. **Scrape app reviews** -> `apify/playwright-scraper`
   - Key input: `startUrls` (Google Play app URL), `maxRequestsPerCrawl`
2. **Filter and alert** (n8n native - IF node)
   - Pipe: `results[].stars` -> filter where `stars < 4`

### Output fields
Step 1: `stars`, `text`, `date`, `appVersion`, `thumbsUpCount`

### Gotcha
Google Play uses heavy client-side rendering. Use `apify/playwright-scraper` rather than cheerio. If results are thin, search Apify Store for a dedicated Google Play reviews Actor - the ecosystem updates frequently.

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

## Multi-platform review aggregation for hospitality
**When:** User wants a weekly sentiment digest across TripAdvisor, Booking.com, Google, and Yelp for a property - including theme extraction by category (service, rooms, location, price).

### Pipeline
1. **Aggregate all platforms** -> `tri_angle/hotel-review-aggregator`
   - Key input: `startUrls` (property page URLs per platform), `maxReviews`, `includeReviews`
2. **Airbnb reviews** (if applicable) -> `tri_angle/airbnb-reviews-scraper`
   - Key input: `startUrls` (Airbnb listing URLs), `maxReviews`

### Output fields
Step 1: `stars`, `text`, `title`, `reviewDate`, `source`, `userProfile.name`
Step 2: `stars`, `text`, `reviewDate`, `reviewerName`

### Gotcha
Review aggregators pull from multiple platforms in one run - cheaper than running separate scrapers per platform. Use the aggregators when covering 3+ platforms. For Airbnb specifically, run the dedicated `tri_angle/airbnb-reviews-scraper` separately and merge by date.

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
