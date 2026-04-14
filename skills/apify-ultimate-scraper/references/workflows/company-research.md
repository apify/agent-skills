# Company research workflows

## Company intelligence profiling for sales or ABM
**When:** User has a list of target accounts and wants structured firmographic data, ICP signals, and key personnel for outreach or account-based marketing.

### Pipeline
1. **Crawl company website** -> `apify/website-content-crawler`
   - Key input: `startUrls` (company domains), `maxCrawlDepth` (2), `includeUrlGlobs` (about, pricing, team, careers, blog)
2. **Enrich with LinkedIn company data** -> `harvestapi/linkedin-company`
   - Pipe: company name or LinkedIn URL extracted from WCC text -> Actor input
   - Key input: company identifier, `includeEmployees: false`
3. **AI extract structured signals** (n8n: OpenAI node outputs JSON schema with `companySize`, `industry`, `techStack`, `keyPersonnel`, `painSignals`)
4. **Store** in Supabase, Airtable, or HubSpot with AI-extracted fields as custom properties

### Output fields
WCC: `text` (per page), `url`
LinkedIn: `employeeCount`, `industry`, `headquarters`, `description`, `specialties`
AI-extracted: `companySize`, `industry`, `techStack`, `keyPersonnel`, `painSignals`

### Gotcha
WCC crawl at depth 2 can return 20-50 pages per company. For large batches, set `maxCrawlPages: 5` focused on the About and Pricing pages via `includeUrlGlobs`. This keeps cost and latency manageable without sacrificing signal quality.

---

## Startup scouting from Product Hunt
**When:** User wants weekly discovery of recently launched or funded startups in a target category for investor outreach, partnership, or competitive tracking.

### Pipeline
1. **Scrape Product Hunt launches** -> `apify/web-scraper`
   - Key input: `startUrls` (Product Hunt today/weekly/topic pages), `maxCrawlPages` (3-5)
   - Note: no dedicated Actor exists - search `apify actors search "product hunt"` for community options
2. **Filter by category + upvote threshold** (n8n: Filter node on extracted `upvotes`, `category`)
3. **Crawl company sites** -> `apify/website-content-crawler`
   - Pipe: `results[].website` -> `startUrls`
   - Key input: `maxCrawlPages` (3), `includeUrlGlobs` (about, team)
4. **LinkedIn founder lookup** -> `harvestapi/linkedin-profile-search` (by name + company)
   - Pipe: extracted founder names from step 3 -> search input
5. **AI ICP scoring** (n8n: OpenAI node scores each startup against defined criteria)
6. **Output** to Airtable pipeline + Slack alert for top matches

### Output fields
Step 1: `title`, `tagline`, `upvotes`, `website`, `makers[].name`, `makers[].profileUrl`
WCC: `text`, `url`
LinkedIn: `fullName`, `headline`, `profileUrl`, `currentCompany`

### Gotcha
Product Hunt ranking changes throughout the day. Schedule the scrape for end-of-day (11 pm UTC) to capture final vote counts. For AngelList/Wellfound, no maintained public Actor exists - use `apify/website-content-crawler` on search result pages as a fallback.

---

## Sales meeting prep from LinkedIn and news
**When:** A calendar event is detected and the user needs a briefing on meeting attendees - their recent activity, company context, and conversation talking points - delivered before the meeting.

### Pipeline
1. **Trigger on calendar event** (n8n: Google Calendar Trigger, filter for events starting in 30 min)
2. **Extract attendee LinkedIn activity** -> `harvestapi/linkedin-profile-scraper` + `harvestapi/linkedin-profile-posts`
   - Key input: `profiles` (attendee LinkedIn URLs), `maxPosts` (5 recent posts)
3. **Extract company context** -> `harvestapi/linkedin-company`
   - Pipe: `results[].currentCompany` -> company name
4. **Search recent news** -> `apify/google-search-scraper`
   - Pipe: company name + "news" -> `queries`
   - Key input: `queries`, `maxResultsPerPage` (5)
5. **AI synthesize brief** (n8n: OpenAI node produces: key topics, recent signals, suggested talking points)
6. **Deliver** via Gmail or WhatsApp node 30 minutes before meeting start

### Output fields
Profiles: `fullName`, `headline`, `recentPosts[]`, `experience[0]`
Posts: `postText`, `publishedAt`, `likes`, `comments`
Company: `description`, `employeeCount`, `recentNews`
Search: `organicResults[].title`, `organicResults[].snippet`, `organicResults[].url`

### Cost estimate
All HarvestAPI Actors are PPE. Per meeting with 2 attendees: profile scraper ~$0.02, posts ~$0.01, company ~$0.005, Google search ~$0.01. Total: ~$0.05 per meeting prep.

### Gotcha
LinkedIn profile URLs must be in the calendar event description or a linked CRM record - they won't auto-resolve from email addresses. Set up a step in your CRM or calendar template to include LinkedIn URLs for attendees. Without a valid `profileUrl`, the HarvestAPI Actors return empty results.
