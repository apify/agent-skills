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

## Instagram competitor content analysis
**When:** User wants to identify top-performing content formats and engagement patterns from competitor Instagram accounts.

### Pipeline
1. **Get competitor posts** -> `apify/instagram-post-scraper`
   - Key input: `usernames` (competitor handles), `resultsLimit` (100), `scrapePostsUntilDate`
2. **Get reels separately** -> `apify/instagram-reel-scraper`
   - Key input: `usernames` (same handles)

### Output fields
Step 1: `likesCount`, `commentsCount`, `timestamp`, `type` (post/reel/story), `caption`, `displayUrl`, `url`
Step 2: `likesCount`, `commentsCount`, `playsCount`, `duration`, `caption`, `url`

### Gotcha
Run both Actors to capture full content mix - the post scraper may under-count reels. Calculate engagement rate per post (likes + comments / follower count) and sort to surface top performers.

## LinkedIn company page analytics
**When:** User wants to track LinkedIn post performance for a company page or benchmark against competitors.

### Pipeline
1. **Get company posts** -> `harvestapi/linkedin-company-posts`
   - Key input: `companyUrl`, `maxPosts`, `publishedAfter`
2. **Enrich post details** -> `apimaestro/linkedin-post-detail`
   - Pipe: `results[].url` -> `urls`

### Output fields
Step 1: `likesCount`, `commentsCount`, `repostsCount`, `text`, `publishedAt`, `url`
Step 2: `reactions{}` (breakdown by type), `topComments[]`, `impressions`

### Gotcha
Both Actors are PPE. Step 1: ~$0.002/post, Step 2: ~$0.005/post. For 100 posts across 3 companies, estimate ~$2.10. Confirm with user before running.

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
