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
