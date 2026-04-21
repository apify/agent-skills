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

---

## Cross-platform influencer discovery
**When:** User wants to find an influencer's presence across multiple platforms.

### Pipeline
1. **Search across platforms** -> `tri_angle/social-media-finder`
   - Key input: `query` (influencer name or handle), `platforms`

### Output fields
Step 1: `platform`, `profileUrl`, `username`, `followers`, `isVerified`

---

## TikTok creator vetting
**When:** User wants to vet TikTok creators by niche or handle for partnership fit based on engagement rate and content quality.

### Pipeline
1. **Get profile metrics** -> `clockworks/tiktok-profile-scraper`
   - Key input: `profiles` (username array), `resultsPerPage`
2. **Pull recent videos** -> `clockworks/tiktok-video-scraper`
   - Pipe: `results[].authorMeta.name` -> `profiles`
   - Key input: `profiles`, `maxItems`

### Output fields
Step 1: `authorMeta.name`, `authorMeta.fans`, `authorMeta.heart`, `authorMeta.video`
Step 2: `diggCount`, `playCount`, `commentCount`, `shareCount`, `createTimeISO`, `hashtags`, `text`

### Gotcha
TikTok engagement rate must be calculated manually: `(diggCount + commentCount + shareCount) / playCount`. The Actor does not return a pre-calculated ER field.

---

## YouTube channel audit
**When:** User wants to audit YouTube channels for subscriber growth, average views, and topic consistency before sponsorship.

### Pipeline
1. **Get channel overview** -> `streamers/youtube-channel-scraper`
   - Key input: `startUrls` (channel URLs), `maxResults`
2. **Pull video metrics** -> `streamers/youtube-scraper`
   - Pipe: `results[].channelUrl` -> `startUrls`
   - Key input: `startUrls`, `maxResults`
3. **Analyze content themes** -> `curious_coder/youtube-transcript-scraper`
   - Pipe: `results[].url` -> video URLs (pick 5-10 recent videos)
   - Key input: video URLs

### Output fields
Step 1: `channelName`, `numberOfSubscribers`, `channelTotalViews`, `channelUrl`
Step 2: `videos[].viewCount`, `videos[].likeCount`, `videos[].title`, `videos[].publishedAt`
Step 3: `transcript` (raw text for AI topic classification)

---

## Cross-platform hashtag discovery
**When:** User wants to discover new influencer candidates across Instagram, TikTok, and YouTube using niche hashtags for a unified shortlist.

### Pipeline
1. **Instagram hashtag scrape** -> `apify/instagram-hashtag-scraper`
   - Key input: `hashtags` (array), `resultsLimit`
2. **TikTok hashtag scrape** -> `clockworks/tiktok-hashtag-scraper`
   - Key input: `hashtags` (same array), `maxItems`
3. **YouTube hashtag scrape** -> `streamers/youtube-video-scraper-by-hashtag`
   - Key input: `hashtags` (same array), `resultsLimit`

### Output fields
Step 1: `ownerUsername`, `followersCount`, `profileUrl`, `likesCount`, `commentsCount`
Step 2: `authorMeta.name`, `authorMeta.fans`, `playCount`, `diggCount`, `shareCount`
Step 3: `channelName`, `numberOfSubscribers`, `viewCount`, `channelUrl`

### Gotcha
Each platform returns platform-specific field names. Normalize to a common schema (`username`, `platform`, `followersCount`, `avgEngagement`, `profileUrl`) in a downstream merge step before scoring.
