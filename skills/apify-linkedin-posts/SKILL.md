---
name: apify-linkedin-posts
description: Scrape LinkedIn profile posts and generate a validated HTML report with post URLs and content. Extracts posts from the last 3 months, cross-validates via direct URL fetch, and outputs a styled, browser-ready report. Use when user asks to analyze LinkedIn activity, scrape profile posts, audit someone's LinkedIn content, or generate a LinkedIn posts report.
---

# LinkedIn Posts Report

Scrape a LinkedIn profile's recent posts and generate a validated HTML report with post URLs and content.

## Prerequisites
(No need to check it upfront)

- `.env` file with `APIFY_TOKEN`
- Node.js 20.6+ (for native `--env-file` support)

## Workflow

Copy this checklist and track progress:

```
Task Progress:
- [ ] Step 1: Parse LinkedIn profile URL and extract username
- [ ] Step 2: Verify Apify connection
- [ ] Step 3: Scrape profile details and posts
- [ ] Step 4: Filter posts to last 3 months
- [ ] Step 5: Validate data accuracy
- [ ] Step 6: Generate HTML report
- [ ] Step 7: Open report in browser
```

### Step 1: Parse LinkedIn Profile URL

Extract the LinkedIn username from user input. Accept any of these formats:
- Full URL: `https://www.linkedin.com/in/username/`
- URL with locale: `https://www.linkedin.com/in/username/?locale=en_US`
- Just the username: `username`

Strip trailing slashes and query parameters to isolate the username.

If no URL or username is provided, ask the user for the LinkedIn profile URL.

### Step 2: Verify Apify Connection

Test the Apify connection before proceeding:

```bash
node --env-file=.env -e "
const token = process.env.APIFY_TOKEN;
if (!token) { console.error('APIFY_TOKEN not found in .env'); process.exit(1); }
fetch('https://api.apify.com/v2/users/me?token=' + token)
  .then(r => r.json())
  .then(d => { if (d.data) console.log('Connected as: ' + d.data.username); else throw new Error('Invalid token'); })
  .catch(e => { console.error('Auth failed: ' + e.message); process.exit(1); });
"
```

**If connection fails**, guide the user:

1. Open the Apify sign-in page: `open https://console.apify.com/sign-in`
2. After sign-in, get API token from: `open https://console.apify.com/account/integrations`
3. Add token to `.env` file: `APIFY_TOKEN=your_token_here`
4. Retry the connection test

Do NOT proceed until the connection is confirmed.

### Step 3: Scrape Profile Data

Run **two actors in parallel** to scrape both profile details and posts.

**Profile Posts** — Actor: `apimaestro/linkedin-profile-posts`

```bash
node --env-file=.env ${SKILL_PATH}/reference/scripts/run_actor.js \
  --actor "apimaestro/linkedin-profile-posts" \
  --input '{"username": "USERNAME", "limit": 100, "page_number": 1}' \
  --output linkedin-posts-USERNAME.json \
  --format json
```

**Profile Details** — Actor: `apimaestro/linkedin-profile-detail`

```bash
node --env-file=.env ${SKILL_PATH}/reference/scripts/run_actor.js \
  --actor "apimaestro/linkedin-profile-detail" \
  --input '{"username": "USERNAME"}' \
  --output linkedin-profile-USERNAME.json \
  --format json
```

Replace `USERNAME` with the extracted username.

### Step 4: Filter Posts to Last 3 Months

After both scripts complete:

1. Read the posts JSON file
2. Calculate the date 3 months before today
3. Filter to only posts where `posted_at.date` is within the 3-month window
4. Keep all post types: `regular` (original), `quote`, `repost`
5. Note any significant posting gaps (>3 weeks with no activity)

### Step 5: Validate Data Accuracy

Spot-check **2 posts** for accuracy by fetching their direct LinkedIn URLs:
- Pick one original post and one repost/quote if available
- Compare the scraped text against what's visible on the public post page
- Verify: author name, content text, approximate date
- Flag any discrepancies

Also verify that profile details (name, headline, company) match between the two data sources.

**Note:** LinkedIn may block direct URL access with a login wall (HTTP 999). If validation fails, note that scraped data is from Apify's API and is likely accurate, but could not be independently verified.

### Step 6: Generate HTML Report

Create a self-contained HTML file at `linkedin-report-USERNAME.html` with these sections:

#### Header
- Full name, headline, location
- About/bio summary (italic, left-bordered quote style)
- Meta stats: follower count, connection count, premium status, report period, total posts found

#### Posts Table
| Column | Description |
|--------|-------------|
| # | Row number |
| Date | Formatted as `Mon DD, YYYY` |
| Post URL | Clickable "View post" link (`target="_blank"`) |
| Content | **Bold**: person's own text. Gray/smaller: context about shared/quoted content |
| Type | Color-coded badge: Original (green), Quote (blue), Repost (orange) |

#### Validation Summary
- Checkmark-styled bullet list of what was verified
- Note box with posting pattern analysis: original vs quote/repost ratio, key content themes (2-4 categories), and any posting gaps

#### Footer
- "Generated on {date} via Apify + Agent Skills"

#### Styling
Use this design system for the HTML:
- Background: `#f3f2ef` (LinkedIn-like)
- Cards: `#fff`, `border-radius: 12px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`
- Table header: `#1b1f23` background, white text, uppercase
- Font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Max width: `960px`, centered
- Badge colors: Original `#e6f4ea/#1e8e3e`, Quote `#e8f0fe/#1a73e8`, Repost `#fef3e0/#e8710a`
- Self-contained with inline `<style>` (no external dependencies)

### Step 7: Open Report and Summarize

1. Open the report in the default browser: `open linkedin-report-USERNAME.html`
2. Provide a text summary:
   - Total posts in the 3-month window
   - Breakdown by type (original/quote/repost)
   - Key content themes observed
   - Notable posting gaps
   - Validation status

## Actor Reference

| Actor | Purpose | Pricing |
|-------|---------|---------|
| `apimaestro/linkedin-profile-posts` | Scrape posts with content, reactions, comments, media | ~$0.005/post |
| `apimaestro/linkedin-profile-detail` | Full profile: experience, education, certifications | ~$0.005/profile |

Both actors work without LinkedIn cookies or login credentials.

## Error Handling

| Error | Solution |
|-------|----------|
| `APIFY_TOKEN not found` | Create `.env` with `APIFY_TOKEN=your_token` |
| `Actor not found` | Verify actor ID spelling |
| `Run FAILED` | Check Apify console link in error output |
| `0 posts returned` | Profile may be private or username is incorrect |
| `WebFetch returns 999` | LinkedIn login wall — note scraped data is likely accurate |
| `Timeout` | Reduce post limit or increase `--timeout` |

## Example Usage

```
# Scrape posts for a LinkedIn profile
/linkedin-posts https://www.linkedin.com/in/satyanadella/

# Using just the username
/linkedin-posts satyanadella
```
