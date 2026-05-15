---
name: apify-sdk-integration
description: Integrate Apify into an existing JavaScript/TypeScript or Python application using the apify-client package. Use when adding web scraping, automation, or data extraction capabilities to an existing app via the Apify API.
---

# Apify SDK Integration

Add Apify Actor execution to an existing application. This skill covers the `apify-client` package for JS/TS and Python, plus the REST API for other languages.

## When to Use This Skill

- Adding web scraping or automation to an existing app
- Calling Apify Actors programmatically from application code
- Building a product that uses Apify as a backend service
- Integrating Actor results into a data pipeline

## Critical: Package Naming

> **`apify-client`** is the API client for **calling** Actors from your app.
> **`apify`** is the SDK for **building** Actors (wrong package for this use case).
>
> Always install `apify-client`. Never install `apify` for integration work.

## Prerequisites

The user needs an `APIFY_TOKEN`. Direct them to **Console > Settings > Integrations** at https://console.apify.com/settings/integrations to create one. If they don't have an account: https://console.apify.com/sign-up (free, no credit card).

Store the token securely — environment variable or secrets manager, never hardcoded.

## Finding the Right Actor

Before writing integration code, find the Actor that fits the user's needs. Use the MCP tools if available:
- `search-actors` — search the Apify Store by keyword
- `fetch-actor-details` — get the Actor's input schema, output format, and pricing

Alternatively, browse https://apify.com/store. Append `.md` to any Actor's Store URL to get its docs in markdown.

## JavaScript / TypeScript

### Install

```bash
npm install apify-client
```

### Synchronous Execution (wait for results)

```typescript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

const run = await client.actor('apify/web-scraper').call({
    startUrls: [{ url: 'https://example.com' }],
    maxPagesPerCrawl: 10,
});

const { items } = await client.dataset(run.defaultDatasetId).listItems();
```

`.call()` blocks until the Actor finishes. Use for short-running Actors (under a few minutes).

### Asynchronous Execution (start and poll/retrieve later)

```typescript
const run = await client.actor('apify/web-scraper').start({
    startUrls: [{ url: 'https://example.com' }],
});

// Poll for completion
const finishedRun = await client.run(run.id).waitForFinish();

// Retrieve results
const { items } = await client.dataset(finishedRun.defaultDatasetId).listItems();
```

Use `.start()` + `.waitForFinish()` for long-running Actors or when you need the run ID immediately.

### Retrieving Results

```typescript
// Dataset items (structured data from pushData)
const { items } = await client.dataset(run.defaultDatasetId).listItems({
    limit: 100,
    offset: 0,
});

// Key-value store (files, screenshots, etc.)
const record = await client.keyValueStore(run.defaultKeyValueStoreId).getRecord('OUTPUT');
```

### Error Handling

```typescript
try {
    const run = await client.actor('apify/web-scraper').call(input);

    if (run.status !== 'SUCCEEDED') {
        const log = await client.log(run.id).get();
        throw new Error(`Actor failed with status ${run.status}: ${log}`);
    }

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
} catch (error) {
    if (error.message?.includes('not found')) {
        // Actor ID is wrong or Actor was deleted
    } else if (error.statusCode === 401) {
        // Invalid or missing APIFY_TOKEN
    }
    throw error;
}
```

## Python

### Install

```bash
pip install apify-client
```

### Synchronous Execution

```python
from apify_client import ApifyClient
import os

client = ApifyClient(token=os.environ['APIFY_TOKEN'])

run = client.actor('apify/web-scraper').call(run_input={
    'startUrls': [{'url': 'https://example.com'}],
    'maxPagesPerCrawl': 10,
})

items = client.dataset(run['defaultDatasetId']).list_items().items
```

### Asynchronous Execution

```python
run = client.actor('apify/web-scraper').start(run_input={
    'startUrls': [{'url': 'https://example.com'}],
})

# Poll for completion
finished_run = client.run(run['id']).wait_for_finish()

items = client.dataset(finished_run['defaultDatasetId']).list_items().items
```

### Async Client (asyncio)

```python
from apify_client import ApifyClientAsync

client = ApifyClientAsync(token=os.environ['APIFY_TOKEN'])

run = await client.actor('apify/web-scraper').call(run_input={
    'startUrls': [{'url': 'https://example.com'}],
})

items = (await client.dataset(run['defaultDatasetId']).list_items()).items
```

## REST API (Any Language)

For languages without an official client, use the REST API directly.

### Start a Run

```
POST https://api.apify.com/v2/acts/{actorId}/runs
Authorization: Bearer <APIFY_TOKEN>
Content-Type: application/json

{ "startUrls": [{ "url": "https://example.com" }] }
```

### Get Run Status

```
GET https://api.apify.com/v2/acts/{actorId}/runs/{runId}
Authorization: Bearer <APIFY_TOKEN>
```

### Get Dataset Items

```
GET https://api.apify.com/v2/datasets/{datasetId}/items?format=json
Authorization: Bearer <APIFY_TOKEN>
```

Full API reference: https://docs.apify.com/api/v2

## Best Practices

- **Set timeouts:** Pass `timeoutSecs` in the Actor input or use `waitSecs` on `.call()` to avoid indefinite waits.
- **Paginate large datasets:** Use `limit` and `offset` when retrieving dataset items. Default limit is 250K items.
- **Reuse clients:** Create one `ApifyClient` instance and reuse it across calls.
- **Handle Actor-specific input:** Every Actor has its own input schema. Use `fetch-actor-details` MCP tool or append `.md` to the Actor's Store URL to get the schema before constructing input.

## Documentation

- Apify API client for JS: https://docs.apify.com/api/client/js
- Apify API client for Python: https://docs.apify.com/api/client/python
- REST API reference: https://docs.apify.com/api/v2
- Apify docs (LLM-friendly): https://docs.apify.com/llms.txt
- Apify docs (full): https://docs.apify.com/llms-full.txt

If the Apify MCP server is available, use `search-apify-docs` and `fetch-apify-docs` tools for contextual documentation lookups during development.
