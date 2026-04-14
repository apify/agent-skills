# Contact enrichment workflows

## Website contact extraction from a URL list
**When:** User has a list of company websites and wants emails, phone numbers, and social links for outreach.

### Pipeline
1. **Extract contact info** -> `vdrmota/contact-info-scraper` or `compass/contact-details-scraper-standby`
   - Key input: `startUrls` (company website URLs), `maxDepth` (crawl depth, 1-2 is usually enough)
2. **Supplement with social signals** -> `apify/social-media-leads-analyzer`
   - Pipe: `results[].domain` -> input domain list
   - Key input: `domains` (company domains), `extractLinkedIn`, `extractTwitter`
3. **Dedup and verify** (n8n: dedup by email domain, optional ZeroBounce/Hunter node for verification)

### Output fields
Step 1: `emails[]`, `phones[]`, `linkedinUrl`, `twitterUrl`, `domain`
Step 2: `socialProfiles`, `linkedinCompanyUrl`, `facebookUrl`

### Gotcha
`contact-details-scraper-standby` is a Standby Actor - it stays warm and responds in < 1s, making it ideal for real-time enrichment in webhook flows. Use it when latency matters. For batch jobs, `vdrmota/contact-info-scraper` is more cost-effective.

---

## LinkedIn warm lead identification from post comments
**When:** User wants to find engaged prospects who commented on relevant LinkedIn posts (competitor content, thought leader posts, industry discussions).

### Pipeline
1. **Scrape post comments** -> `harvestapi/linkedin-post-comments`
   - Key input: `postUrl` (LinkedIn post URL), `maxComments`
2. **Enrich commenter profiles** -> `harvestapi/linkedin-profile-scraper`
   - Pipe: `results[].commenter.profileUrl` -> `urls`
   - Key input: `urls`, `includeEmail: true`
3. **Filter by ICP criteria** (n8n: Filter node on `headline` or `companyName`)
4. **AI draft outreach** (n8n: OpenAI node generates personalized message using `commentText` + `headline`)

### Output fields
Step 1: `commenter.name`, `commenter.headline`, `commenter.profileUrl`, `commentText`, `timestamp`
Step 2: `experience[]`, `education[]`, `email`, `phone`, `skills[]`

### Cost estimate
Both Actors are PPE. Step 1 ~ $0.005/comment. Step 2 with `includeEmail: true` ~ $0.01/profile. For 100 commenters enriched: ~$1.50 total.

### Gotcha
Not all LinkedIn posts are publicly accessible. Test `postUrl` manually before building a workflow around it. Private or restricted posts return empty results - no error, just zero items.

---

## Real-time lead enrichment on form submission
**When:** A prospect fills a form and their company needs to be enriched automatically for ICP scoring and sales routing.

### Pipeline
1. **Receive form webhook** (n8n: Webhook trigger from HubSpot/Typeform/custom form)
2. **Extract company domain** (n8n: Function node parses email domain)
3. **Crawl company site** -> `apify/website-content-crawler`
   - Key input: `startUrls` (company domain), `maxCrawlPages` (3-5), `includeUrlGlobs` (about, pricing, careers, team)
4. **Enrich with LinkedIn firmographics** -> `harvestapi/linkedin-company` (optional, for headcount + industry)
   - Pipe: company name or LinkedIn URL derived from WCC output
5. **AI extract signals** (n8n: OpenAI node extracts companySize, industry, techStack, ICPFit score from crawl text)
6. **Route** (n8n: Switch node sends high-ICP leads to Slack sales channel, others to nurture sequence)

### Output fields
WCC: `text`, `title`, `url`, `metadata.description`
LinkedIn: `employeeCount`, `industry`, `headquarters`, `description`, `website`

### Gotcha
WCC crawl on a small startup site can take 30-60 seconds. For synchronous form flows, set `maxCrawlPages: 3` and use a timeout. If latency is critical, use `apify/cheerio-scraper` for the About page only and skip LinkedIn enrichment for first response.
