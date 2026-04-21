# Knowledge base and RAG pipeline workflows

## Website to RAG knowledge base via sitemap crawl
**When:** User wants to ingest an entire website or documentation site into a vector database for AI retrieval (chatbots, search, AI agents).

### Pipeline
1. **Extract sitemap** -> `apify/sitemap-extractor`
   - Key input: `sitemapUrl` or `domain`
2. **Crawl and convert to markdown** -> `apify/website-content-crawler`
   - Pipe: `results[].url` -> `startUrls` (or pass dataset ID)
   - Key input: `startUrls`, `maxCrawlPages`, `htmlTransformer: "readableText"`, `outputFormats: ["markdown"]`
3. **Chunk and embed** (n8n: Recursive Character Text Splitter -> OpenAI Embeddings node)
4. **Upsert to vector DB** (n8n: Supabase / Qdrant node with document + metadata)

### Output fields
`text` (clean markdown), `url`, `metadata.title`, `metadata.description`, `crawledAt`

### Gotcha
`apify/rag-web-browser` is purpose-built for RAG use cases and returns pre-chunked, clean text without boilerplate - use it when you want simpler output and don't need full site coverage. For comprehensive crawls (full docs sites, 100+ pages), `website-content-crawler` gives more control over depth and URL filtering.

---

## Deep research agent with web crawling
**When:** User or an AI agent submits a research question and wants a synthesized report drawn from live web sources.

### Pipeline
1. **Generate search queries** (n8n: AI node expands research question into 3-5 distinct queries)
2. **Search** -> `apify/google-search-scraper`
   - Pipe: generated queries -> `queries` (array)
   - Key input: `queries`, `maxResultsPerPage` (5-10)
3. **Retrieve content** -> `apify/rag-web-browser`
   - Pipe: `results[].organicResults[].url` -> `query` (RAG browser takes query + crawls most relevant result)
   - Key input: `query`, `maxResults`, `requestTimeoutSecs`
4. **Synthesize** (n8n: OpenAI node assembles final report from per-source summaries)
5. **Output** to n8n Data Table, Notion, or Google Docs

### Output fields
Search: `organicResults[].url`, `organicResults[].title`, `organicResults[].snippet`
RAG browser: `text`, `url`, `metadata.title`

### Gotcha
`apify/rag-web-browser` fetches and summarizes a single URL per call. To process multiple search results in parallel, use n8n's Split In Batches node with a concurrency of 3-5 rather than running them sequentially. This cuts total runtime significantly for 10+ URLs.

---

## Scheduled news monitoring to AI knowledge feed
**When:** User wants to track industry news sources daily, filter new articles, summarize them, and store in a searchable knowledge base (Notion, NocoDB, Supabase).

### Pipeline
1. **Extract articles** -> `lukaskrivka/article-extractor-smart`
   - Key input: `startUrls` (news site listing pages), `maxCrawlPages`, `articleSelector` (optional CSS hint)
2. **Filter new articles only** (n8n: compare `publishedAt` or URL against stored records in DB)
3. **Full article content** (optional) -> `apify/website-content-crawler`
   - Pipe: new article `url` values -> `startUrls`
   - Use when listing-page extract is too short for quality summarization
4. **AI summarize + tag** (n8n: OpenAI node generates 3-sentence summary + keyword tags)
5. **Upsert to knowledge base** (n8n: Notion / NocoDB / Supabase node)

### Output fields
Step 1: `title`, `text`, `publishedAt`, `author`, `url`, `tags`
Step 3 (WCC): full `text`, `metadata.title`, `metadata.description`

### Gotcha
`lukaskrivka/article-extractor-smart` handles most news formats well, but paywalled sites return truncated content. Check `text` length - if consistently under 200 characters for a given source, that site is paywalled and should be removed from the list. Deduplicate by URL before summarizing to avoid re-processing old articles on re-runs.
