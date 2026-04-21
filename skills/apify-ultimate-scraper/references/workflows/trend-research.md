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

## Reddit trend and community insight mining
**When:** User wants to surface emerging trends, product feedback themes, or competitor mentions from Reddit communities.

### Pipeline
1. **Scrape subreddits** -> `trudax/reddit-scraper-lite`
   - Key input: `startUrls` (subreddit URLs), `maxItems`, `sort` (hot/rising/new)

### Output fields
Step 1: `title`, `body`, `subreddit`, `score`, `numberOfComments`, `url`, `createdAt`, `comments[]`

### Gotcha
Use `sort: rising` for early trend signals, `sort: hot` for confirmed trending topics. Filter by `score` threshold (e.g., >50) to reduce noise. Comments array provides qualitative context for AI sentiment analysis.

## YouTube outlier video discovery
**When:** User wants to identify breakout videos in a niche with disproportionate views vs. channel subscriber count - a signal for content strategy pivots.

### Pipeline
1. **Search niche videos** -> `streamers/youtube-scraper`
   - Key input: `searchTerms`, `maxResults`, `sort` (viewCount), `uploadDate` (filter range)
2. **Get channel context** -> `streamers/youtube-channel-scraper`
   - Pipe: `results[].channelUrl` -> `channelUrls`

### Output fields
Step 1: `title`, `viewCount`, `likeCount`, `commentCount`, `channelName`, `publishedAt`, `url`
Step 2: `subscriberCount`, `videoCount`, `viewCount` (channel totals)

### Gotcha
Outlier score = video `viewCount` / channel `subscriberCount`. Ratios > 10x indicate breakout potential. Run Step 2 on a filtered shortlist only - no need to fetch channel data for every result.

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
