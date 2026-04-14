# E-commerce price monitoring workflows

## Competitor product price monitoring with alerts
**When:** User wants to track competitor prices across product pages and get notified when prices change.

### Pipeline
1. **Scrape product pages** -> `apify/e-commerce-scraping-tool`
   - Key input: `startUrls` (competitor product page URLs), `proxyConfiguration`
2. **Match products across sites** -> `tri_angle/e-commerce-product-matching-tool`
   - Pipe: `results[].url` + `results[].name` -> matching input
   - Key input: source dataset ID from step 1, target product list
3. **Compare vs. baseline** (n8n logic: read Google Sheets last_price, compute % change, filter if changed)
4. **Alert** via Telegram/Slack node with price delta

### Output fields
Step 1: `price`, `currency`, `name`, `sku`, `availability`, `url`
Step 2: matched pairs with `similarityScore`, `sourceProduct`, `targetProduct`

### Cost estimate
`apify/e-commerce-scraping-tool` is pay-per-result. For 200 product URLs daily, expect ~$0.50-$1/run depending on site complexity.

### Gotcha
Many e-commerce sites use bot protection. If `e-commerce-scraping-tool` returns empty prices, fall back to `apify/camoufox-scraper` with residential proxy. Set `sessionPoolName` to reuse sessions and reduce blocks.

---

## Amazon product and review tracking
**When:** User wants to monitor own or competitor Amazon listings for price drops or review score changes.

### Pipeline
1. **Extract Amazon data** -> `apify/e-commerce-scraping-tool`
   - Key input: `startUrls` (Amazon product URLs), `extractReviews` (bool)
2. **Compare vs. stored baseline** (n8n: read last values from Sheets or DB)
3. **Alert on new low price or rating drop** (n8n: If node + Telegram/Slack send)

### Output fields
`price`, `currency`, `rating`, `reviewsCount`, `title`, `asin`, `availability`

### Cost estimate
Flat per-result pricing. 50 ASINs daily ~ $0.10-$0.25/run.

### Gotcha
Amazon aggressively rotates prices and sometimes shows regional prices. Always store `currency` alongside `price`. For review text (not just counts), search `apify actors search "amazon reviews"` for a dedicated Actor.

---

## Supplier catalog extraction to draft products
**When:** User wants to pull new products from a supplier portal and create draft listings with AI-enriched descriptions.

### Pipeline
1. **Crawl supplier catalog** -> `apify/playwright-scraper` (JS-heavy portals) or `apify/cheerio-scraper` (static HTML)
   - Key input: `startUrls` (supplier category pages), `pseudoUrls` (product URL patterns), `maxCrawlPages`
2. **Extract product content** -> `apify/website-content-crawler` (optional second pass for detail pages)
   - Pipe: `results[].url` -> `startUrls`
   - Key input: `maxCrawlPages` (1 per product), `htmlTransformer: "readableText"`
3. **AI rewrite** (n8n: OpenAI node generates SEO title + bullets from raw specs)
4. **Create draft product** (n8n: Shopify node `POST /products.json` with `status: "draft"`)

### Output fields
Step 1/2: `text`, `url`, `metadata.title`, inline image URLs

### Cost estimate
Depends on catalog size. `playwright-scraper` is PPE; 500 product pages ~ $1-3.

### Gotcha
Supplier portals often require login. Use `apify/playwright-scraper` with `initialCookies` or a pre-login script in `preNavigationHooks`. Never hardcode credentials - pass via Actor input from n8n credentials store.

---

## Multi-site deal and coupon monitoring
**When:** User wants to detect when competitors run promotions or publish coupon codes so marketing can respond.

### Pipeline
1. **Scrape deals pages** -> `apify/e-commerce-scraping-tool`
   - Key input: `startUrls` (competitor deal/sale page URLs), `proxyConfiguration`
2. **Dynamic JS deal pages** (fallback) -> `apify/camoufox-scraper`
   - Pipe: failed URLs from step 1 -> `startUrls`
3. **AI extract promotion details** (n8n: OpenAI node extracts discount %, promo code, expiry from raw text)
4. **Dedup and alert** (n8n: compare against stored deals DB, Slack notify on new deals)

### Output fields
Raw: `price`, `discountText`, `url`; AI-extracted: `promoCode`, `validUntil`, `discountPercent`, `category`

### Cost estimate
Light scraping - deals pages are few. Expect < $0.20/run for 20 competitor pages.

### Gotcha
Promo codes and flash deals may only be visible after login or in geofenced regions. Test each target URL manually first. AI extraction of expiry dates is unreliable - treat as best-effort signal, not exact data.
