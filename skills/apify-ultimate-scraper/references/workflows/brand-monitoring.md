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

## Twitter/X real-time mention routing
**When:** User wants to route brand mentions on X to the right team channel - negative to support, positive to wins - with sentiment scoring.

### Pipeline
1. **Collect tweets** -> `apidojo/tweet-scraper`
   - Key input: `searchTerms` (brand name + variants), `maxItems`, `since` (ISO date for incremental runs)
2. **Score sentiment** -> `tri_angle/social-media-sentiment-analysis-tool`
   - Pipe: `results[].url` -> `urls`
   - Key input: `urls`, `platforms`

### Output fields
Step 1: `text`, `author.userName`, `createdAt`, `likeCount`, `retweetCount`, `url`
Step 2: `sentiment` (positive/negative/neutral), `score`, `text`, `platform`

### Gotcha
Use `since` on each run (store last tweet `createdAt` in Sheets) to avoid reprocessing the same mentions. Without dedup, alerts fire on the same tweet repeatedly.

## Reddit brand and topic monitoring
**When:** User wants weekly surfacing of brand mentions, product feedback, and competitor comparisons from Reddit.

### Pipeline
1. **Scrape Reddit** -> `trudax/reddit-scraper-lite`
   - Key input: `subreddits` (target subreddit array), `searchTerms` (brand + competitor names), `maxItems`, `sort` (hot/new/top)

### Output fields
Step 1: `title`, `body`, `subreddit`, `url`, `score`, `numberOfComments`, `createdAt`

### Gotcha
Set `sort: "new"` for monitoring runs; use `sort: "top"` for periodic digest reports. Mixing both in one run returns inconsistent result sets.

## Multi-platform social listening with sentiment
**When:** User wants a unified brand health view across Instagram, Facebook, TikTok, and Twitter simultaneously.

### Pipeline (run in parallel)
1. **Instagram** -> `apify/instagram-search-scraper`
   - Key input: `searchTerms` (brand variants), `maxItems`
2. **Facebook** -> `apify/facebook-search-scraper`
   - Key input: `searchTerms`, `maxItems`
3. **TikTok** -> `clockworks/tiktok-user-search-scraper`
   - Key input: `searchTerms`, `maxItems`
4. **Twitter** -> `apidojo/tweet-scraper`
   - Key input: `searchTerms`, `maxItems`
5. **Sentiment scoring** -> `tri_angle/social-media-sentiment-analysis-tool`
   - Pipe: merged post URLs from steps 1-4 -> `urls`
   - Key input: `urls`, `platforms`

### Output fields
Steps 1-4 (normalized): `text`, `platform`, `author`, `timestamp`, `engagementCount`
Step 5: `sentiment`, `score`, `text`, `platform`

## Sentiment analysis
**When:** User wants sentiment scoring on collected mentions.

### Pipeline
1. **Collect mentions** (use any step from above)
2. **Analyze sentiment** -> `tri_angle/social-media-sentiment-analysis-tool`
   - Pipe: collected post URLs -> `urls`
   - Key input: `urls`, `platforms`

### Output fields
Step 2: `sentiment` (positive/negative/neutral), `score`, `text`, `platform`
