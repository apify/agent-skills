---
name: apify-platform-overview
description: Understand Apify platform capabilities to design solutions before building. Consult this skill first when a user asks "how should I do X with Apify?" to choose the right combination of Actors, storage, scheduling, proxy, integrations, and orchestration — then hand off to the actor-development or sdk-integration skill to implement.
---

# Apify platform overview

Apify is a cloud platform and marketplace for web scraping, data extraction, and automation. Its building blocks are **Actors** — serverless programs packaged as Docker images that accept JSON input, perform a task, and produce structured output. The platform provides everything around Actors: storage, scheduling, proxy infrastructure, monitoring, integrations, and a marketplace (Apify Store) with thousands of ready-made Actors.

Use this reference to **design solutions** before writing code. Once you know what to build and which platform features to use, hand off to the `apify-actor-development` skill (to build an Actor), the `apify-sdk-integration` skill (to call Actors from an existing app), or the `apify-ultimate-scraper` skill (to use existing scraper Actors).

## When to consult this skill

- A user asks "how should I do X with Apify?" or "what's the best way to..."
- You need to decide whether to build a new Actor or use an existing one
- You need to choose between platform features (scheduling vs. webhooks, standby vs. batch, proxy tiers, storage types)
- You're designing a multi-step pipeline or workflow on the platform

## Platform capabilities at a glance

| Capability | What it does | When to use it |
|---|---|---|
| [Actors](#actors) | Serverless programs in Docker containers | The core unit of work — every task runs as an Actor |
| [Apify Store](#apify-store) | Marketplace of 30,000+ ready-made Actors | Before building anything, check if it already exists |
| [Actor Tasks](#actor-tasks) | Saved configurations for an Actor | Reuse one Actor with different inputs for different use cases |
| [Storage](#storage) | Datasets, key-value stores, request queues | Persist and share data between runs and Actors |
| [Scheduling](#scheduling) | Cron-based automated runs | Recurring jobs (daily scrapes, hourly monitors) |
| [Proxy](#proxy) | Datacenter, residential, and SERP proxies | Avoid IP blocking during web scraping |
| [Webhooks](#webhooks) | HTTP callbacks on run events | Trigger actions when a run succeeds, fails, or times out |
| [Integrations](#integrations) | Connect to external services | Slack alerts, Google Drive exports, Zapier/Make workflows |
| [Actor-to-Actor orchestration](#actor-to-actor-orchestration) | Chain Actors, call other Actors, metamorph | Multi-step pipelines and workflows |
| [Standby mode](#standby-mode) | Actor as a persistent HTTP server | Low-latency real-time API endpoints |
| [Monitoring](#monitoring) | Alerts and metrics dashboards | Track run health, data quality, and cost |
| [MCP server](#mcp-server) | Model Context Protocol integration | Give AI agents access to Actors and docs |
| [AI agent development](#ai-agent-development) | Templates, sandbox, LLM access | Build and deploy AI agents as Actors |
| [API and client libraries](#api-and-client-libraries) | REST API, JS/Python clients | Programmatic access to the entire platform |
| [Collaboration](#collaboration) | Organizations, access rights, sharing | Team workflows and shared resources |

---

## Actors

Actors are the core unit of work on Apify. An Actor is a serverless program packaged as a Docker image that:

- Accepts well-defined JSON input
- Runs in an isolated container with allocated memory, CPU, and disk
- Produces structured output to datasets and/or key-value stores
- Can run from seconds to hours, or indefinitely (standby mode)
- Can persist state and be restarted after interruptions

**How to start an Actor run:**
- Apify Console (web UI)
- REST API: `POST https://api.apify.com/v2/acts/{actorId}/runs`
- API client libraries (JavaScript `apify-client`, Python `apify-client`)
- CLI: `apify run` (local) or `apify actors call` (cloud)
- Schedules (automated cron-based triggers)
- Webhooks (triggered by other Actor events)

**Resource allocation:**
- Memory: 128 MB to 32,768 MB (must be a power of 2)
- CPU: 1 core per 4,096 MB of memory (proportional)
- Disk: 2x the memory allocation
- Billing: compute units = memory (GB) x duration (hours)

**Run lifecycle:** A run progresses through states: READY → RUNNING → SUCCEEDED / FAILED / TIMED-OUT / ABORTED. Runs can be resurrected after completion to retry with the same storage.

See [references/compute-and-billing.md](references/compute-and-billing.md) for details on resource allocation, compute units, and cost optimization.

---

## Apify Store

The Apify Store is a marketplace of 30,000+ public Actors. **Always check the Store before building a new Actor** — the task you need may already be solved.

**Finding Actors:**
- Browse at [apify.com/store](https://apify.com/store)
- Search via CLI: `apify actors search "KEYWORDS" --json`
- Search via API: `GET https://api.apify.com/v2/store?search=KEYWORDS`
- If the Apify MCP server is connected, use the `search-actors` tool
- Append `.md` to any Store Actor URL (e.g., `https://apify.com/apify/web-scraper.md`) to get its documentation in markdown

**Pricing models for Store Actors:**
- **Pay per event (PPE):** Charges for specific actions (e.g., per result, per search, per page). Most include platform compute costs in the price. You can set a maximum charge per run.
- **Pay per usage:** You pay only for the platform resources consumed (compute, proxy, storage). Cost depends on run duration and memory.

**When to build vs. reuse:**
- **Reuse** when a Store Actor covers your exact use case or a close variant
- **Build** when your requirements are unique, you need custom logic, or you want to chain multiple operations into a single Actor
- **Fork and modify** when a Store Actor is close but needs customization — check if the source is available on GitHub

---

## Actor Tasks

An Actor Task is a saved, reusable configuration for an Actor. One Actor can have many Tasks, each with different input parameters, memory settings, and timeouts.

**Use Tasks when you:**
- Run the same Actor repeatedly with different configurations (e.g., scraping different websites)
- Want to share a specific configuration with team members
- Need to schedule the same Actor with different inputs at different intervals
- Want to publish a preconfigured Actor as a public use-case landing page on the Store

**Key details:**
- Tasks can be started from Console, API, CLI, schedules, and webhooks — just like Actors
- Each Task has its own run history and can have its own webhook and integration setup
- Task names must be 3–63 characters long
- Maximum 1,000 tasks per account

---

## Storage

Apify provides three storage types. Each Actor run automatically gets a default instance of each type, and you can also create named instances that persist indefinitely and are shared across runs.

### Dataset

Append-only storage for structured data (JSON objects). This is where scraping results go.

- Each run gets a default dataset; first `pushData()` call creates it
- Named datasets persist indefinitely; unnamed expire after 7 days (free plan: 4 months for the 10 most recent runs)
- Export formats: JSON, CSV, XML, Excel, HTML, RSS, JSONL
- Maximum individual object size: 9 MB
- Rate limits: 400 req/s for pushes, 60 req/s for other operations
- Data is immutable once written — cannot be modified or deleted per-item

**When to use datasets:**
- Storing scraping results, search results, extracted records
- Any structured output you want to export or process downstream

### Key-value store

Mutable storage for arbitrary data types — JSON, HTML, images, PDFs, text, binary.

- Each run gets a default KV store; the `INPUT` record holds the Actor's input
- Named stores persist indefinitely; unnamed expire after 7 days
- Records are accessed by key (max 63 characters)
- Records are mutable — you can overwrite and delete

**When to use key-value stores:**
- Saving screenshots, PDFs, or other files
- Persisting Actor state between runs
- Storing configuration or intermediate results
- The `OUTPUT` key is conventionally used for the Actor's final summary result

### Request queue

Queue of URLs to visit during crawling, with built-in deduplication.

- Supports both breadth-first and depth-first crawling strategies
- Named queues persist indefinitely and enable incremental crawling across runs
- Locking mechanism prevents concurrent processing of the same URL
- Rate limits: 400 req/s for CRUD on requests, 60 req/s for other operations

**When to use request queues:**
- Web crawling with URL discovery
- Incremental scraping (reuse the queue across runs to skip already-visited URLs)
- Parallelizing URL processing across multiple Actor runs

### Sharing storage across runs

Any named storage can be accessed from multiple Actor runs simultaneously using its name or ID. This enables:

- **Pipelines:** Actor A writes results to a named dataset, Actor B reads and processes them
- **Incremental crawling:** Multiple runs share a named request queue
- **Persistent state:** A named KV store survives across runs of the same Actor

Storage names can be up to 63 characters. Reference named stores with a tilde prefix: `~store-name` or fully qualified: `username~store-name`.

---

## Scheduling

Schedules automatically start Actor or Task runs at specified times using cron expressions with full timezone support.

**Key details:**
- Cron expression with 5-6 fields (second is optional): `MIN HOUR DOM MON DOW`
- Minimum interval between runs: 10 seconds
- Each schedule can trigger up to 10 Actors and 10 Tasks
- Maximum 100 schedules per account
- Schedule names must be 3–63 characters
- Manage via Console, API, or client libraries
- Built-in failure notifications (enabled by default)

**When to use scheduling:**
- Daily/weekly/monthly scraping jobs
- Periodic monitoring and alerting
- Data refresh pipelines
- Any recurring automation

---

## Proxy

Apify Proxy provides IP address rotation to avoid blocking during web scraping. Three tiers are available, each with different trade-offs.

### Datacenter proxy

- **Best for:** High-volume scraping of sites with moderate anti-bot measures
- **Characteristics:** Fastest, cheapest, shared IP pool from datacenters
- **Risk:** Higher chance of blocking on sites with aggressive anti-bot detection
- **Sessions:** Persistent sessions last 26 hours; daily usage keeps them alive indefinitely
- **Dedicated pools:** Available for exclusive IP ranges at additional cost

### Residential proxy

- **Best for:** Sites with strict anti-bot measures, geo-targeted scraping
- **Characteristics:** IPs from real home/office ISP connections; appear as legitimate users
- **Pricing:** Based on data transfer (per GB), not time
- **Geo-targeting:** Country-level and US state-level targeting available
- **Sessions:** Persist for 1 minute, reset with each request
- **Trade-off:** Slower and more expensive than datacenter; occasional connection drops

### Google SERP proxy

- **Best for:** Scraping Google Search results
- **Characteristics:** Specialized for Google Search, Maps, and Shopping
- **Geo-targeting:** Localized results by country and language

**Decision guide:**

| Scenario | Recommended proxy |
|---|---|
| Static sites, no anti-bot | Datacenter (or no proxy) |
| Light to moderate anti-bot | Datacenter with session rotation |
| Aggressive anti-bot (Cloudflare, etc.) | Residential |
| Geo-specific content | Residential with country targeting |
| Google Search results | Google SERP |
| Maximum speed, lowest cost | Datacenter |
| Maximum reliability, lowest block rate | Residential |

---

## Webhooks

Webhooks send HTTP POST requests to a URL when an Actor or Task run reaches a specific state.

**Available trigger events:**
- Run created
- Run succeeded
- Run failed
- Run timed out
- Run aborted

**Key details:**
- Currently the only action is sending an HTTP POST to a configured URL
- Payload templates support variable interpolation (e.g., `{{resource.defaultDatasetId}}`)
- Webhooks can be configured per Actor, per Task, or ad-hoc per API call
- Maximum 100 webhooks per account
- Test webhooks using historical runs as triggers

**Common patterns:**
- Send a Slack/email notification when a scraping run completes
- Trigger a downstream Actor to process results when the first Actor finishes
- Alert on failures for production monitoring
- Push data to an external API or database on completion

---

## Integrations

Apify connects to a wide ecosystem of external services.

### Built-in platform integrations

- **Slack** — notifications on run events
- **Google Drive** — automatically save run results to Drive
- **Gmail** — send email notifications with results
- **GitHub** — auto-build Actors from repos, create issues on failure
- **Airtable** — import dataset items into Airtable

### Integration platforms

Connect Apify to thousands of services via:
- **Zapier** — trigger Zaps on run events, retrieve results
- **Make (Integromat)** — run Actors in Make scenarios
- **n8n** — open-source workflow automation
- **Pipedream** — event-driven workflows
- **Kestra** — declarative YAML workflows
- **IFTTT** — simple trigger-action automations

### Data and AI integrations

- **Vector databases:** Pinecone, Qdrant, Milvus — export Actor results for semantic search
- **ETL:** Airbyte, Keboola — move data from datasets to data warehouses
- **AI/LLM frameworks:** LangChain, LlamaIndex, CrewAI, LangGraph, OpenAI Assistants, Vercel AI SDK, Google ADK, Mastra
- **Snowflake** — native app for importing dataset results directly

### Actor-to-Actor integrations

Actors can be connected directly on the platform through the Integrations tab:
- Configure one Actor/Task to trigger another on specific events
- Use variable interpolation to pass run metadata (dataset IDs, etc.) to the downstream Actor
- The platform constructs webhook payloads automatically via a UI

See [references/orchestration.md](references/orchestration.md) for details on Actor-to-Actor patterns.

---

## Actor-to-Actor orchestration

Multiple approaches exist for building multi-step workflows with Actors.

### Calling other Actors

From within an Actor, you can programmatically start other Actor runs:

- **`Actor.call()`** — start another Actor and wait for it to finish (synchronous)
- **`Actor.start()`** — start another Actor without waiting (asynchronous)
- **`Actor.callTask()`** — start a Task and wait for it to finish

The called Actor runs under the same account. You can pass input and retrieve results from the called Actor's default dataset or KV store.

### Metamorph

Metamorph transforms the current Actor run into a different Actor while preserving all default storage (dataset, KV store, request queue). The original Actor's container stops and a new one starts.

- Use for delegating work to a specialized Actor (e.g., a generic "router" Actor metamorphs into a site-specific scraper)
- Maximum 10 metamorphs per run
- The new Actor reads input from the key `INPUT-METAMORPH-N` in the KV store

### Webhooks for chaining

Use webhooks to trigger a downstream Actor when the upstream Actor finishes:
- No code changes needed in either Actor
- Configure via Console UI, API, or ad-hoc in the API call that starts the run
- Payload template passes the upstream run's metadata (dataset ID, etc.) to the downstream Actor

### Integration-ready Actors

Actors can be designed specifically as integration targets that accept webhook payloads and process upstream data. The Apify Store has a catalog of "Integration Actors" built for this purpose.

**Decision guide for orchestration:**

| Pattern | When to use |
|---|---|
| `Actor.call()` / `Actor.start()` | Actor A needs to invoke Actor B as part of its logic |
| Metamorph | Actor A wants to hand off entirely to Actor B, sharing storage |
| Webhook chaining | Loose coupling — Actor A doesn't know about Actor B |
| Integration-ready Actors | Reusable pipeline components from the Store |
| Shared named storage | Multiple independent Actors reading/writing the same data |

---

## Standby mode

Standby mode lets an Actor run as a persistent HTTP server, accepting real-time requests without cold-start delays. The Actor stays alive in the background, waiting for incoming HTTP requests.

**Key characteristics:**
- Supports all HTTP methods (GET, POST, PUT, DELETE)
- Input via query strings or request body
- Maximum 5-minute response timeout per request
- Rate limit: 2,000 requests/second per account
- Auto-scaling: platform launches additional runs to handle load
- Billing: same as normal runs (idle time still consumes resources)
- Each Task has its own unique hostname for Standby requests

**When to use Standby vs. batch:**

| Scenario | Mode |
|---|---|
| Respond to HTTP requests in real-time | Standby |
| Process data in bulk and save results | Batch (normal run) |
| Low-latency API endpoint | Standby |
| Scheduled recurring job | Batch with scheduling |
| Cost-sensitive (only pay when processing) | Batch |
| Always-on service | Standby |

**Note:** Every Actor is already accessible as an API endpoint via `POST /v2/acts/{id}/runs`. Standby is only needed when you need persistent, low-latency responses (sub-second) without container startup time. For most use cases, the normal API-triggered batch run is sufficient.

---

## Monitoring

The platform includes built-in monitoring for Actor and Task runs.

**Monitoring features:**
- Status charts showing run outcomes over the last 30 days
- Metrics visualization for the last 200 runs
- Configurable alerts via email, Slack, or in-Console notifications

**Alert types:**
- Metrics below/above thresholds (run duration, result count, cost)
- Run status conditions (failure, timeout)
- Dataset field statistics from schema validation

**Advanced monitoring:** For complex requirements, Apify offers a monitoring suite of Actors that provide schema validation, duplicate detection, and dashboard grouping.

**What to monitor for scraping Actors:**
- Result count per run (detect empty or too-small results)
- Run duration (detect slowdowns or hangs)
- Field completeness (detect schema drift from website changes)
- Cost per run (detect unexpected resource consumption)
- Proxy usage (track proxy consumption and blocking rates)

---

## MCP server

The Apify MCP server enables AI agents and LLM applications to interact with the Apify platform using the Model Context Protocol.

**What it provides:**
- Search and discover Actors in the Store
- Run Actors and retrieve results
- Access datasets and key-value stores
- Monitor Actor runs and read logs
- Search and retrieve Apify documentation

**Connection methods:**
- **Remote (recommended):** `https://mcp.apify.com` — supports OAuth or Bearer token authentication
- **Local:** `npx -y @apify/actors-mcp-server` with `APIFY_TOKEN` environment variable

**Dynamic tool discovery:** AI agents can search the Store, inspect an Actor's input schema, add it as a tool, and execute it — all through MCP.

**Rate limit:** 30 requests per second per user.

**Supported clients:** Claude Desktop, Claude Code, ChatGPT, OpenAI Agents SDK, Cursor, and any MCP-compatible client.

---

## AI agent development

Apify provides infrastructure for building and deploying AI agents as Actors.

**Key capabilities:**

- **Framework templates:** Pre-built templates for LangChain, CrewAI, LlamaIndex, PydanticAI, Mastra, Smolagents, and MCP. Initialize with `apify create my-agent`.
- **AI Sandbox:** Isolated containerized environment where agents can execute JavaScript, TypeScript, Python, and bash code safely. Supports filesystem operations and dependency installation.
- **LLM access via OpenRouter:** The OpenRouter Actor provides access to 100+ LLMs (OpenAI, Anthropic, Google, Mistral, Meta) through your Apify account using an OpenAI-compatible API — no separate billing setup needed.
- **MCP connectors:** Enable Actors to securely call third-party services (Slack, Notion, GitHub) without exposing credentials to Actor code. Credentials stay server-side.
- **Monetization:** AI agents can be published to the Store and monetized with pay-per-event pricing.

---

## API and client libraries

The Apify REST API provides programmatic access to all platform features.

**Base URL:** `https://api.apify.com/v2`

**Authentication:**
- HTTP `Authorization: Bearer <token>` header (recommended)
- URL query parameter `?token=<token>` (less secure)
- Scoped tokens available for limited-permission access

**Official client libraries:**
- **JavaScript/TypeScript:** `npm install apify-client` — [docs](https://docs.apify.com/api/client/js)
- **Python:** `pip install apify-client` — [docs](https://docs.apify.com/api/client/python)

Both clients provide automatic retries with exponential backoff, pagination, and convenience methods like `.call()` (run and wait) and `.waitForFinish()`.

**Important:** `apify-client` is for **calling** Actors from external apps. `apify` (the SDK) is for **building** Actors. Don't confuse the two.

**Key API endpoints:**
- `POST /v2/acts/{actorId}/runs` — start an Actor run
- `GET /v2/acts/{actorId}/runs/{runId}` — check run status
- `GET /v2/datasets/{datasetId}/items` — retrieve dataset results
- `GET /v2/key-value-stores/{storeId}/records/{key}` — retrieve KV store records
- `GET /v2/store` — search the Apify Store

**Sync API endpoint:** `POST /v2/acts/{actorId}/run-sync-get-dataset-items` — starts a run, waits for completion, and returns dataset items in a single request (up to 5-minute timeout).

Full API reference: [docs.apify.com/api/v2](https://docs.apify.com/api/v2)

---

## Collaboration

Apify supports team workflows through multiple sharing mechanisms.

**Organization accounts:**
- Shared workspace for teams with role-based access
- Members get permissions scoped to their role
- Shared billing and resource usage

**Access rights:**
- Grant specific users read, run, write, or build access to individual Actors, Tasks, or storage
- Granular per-resource permissions

**Link sharing:**
- Actor runs, builds, and storage resources can be shared via their unique ID/link
- Time-limited pre-signed URLs for restricted access to specific storage records

**Apify Store publishing:**
- Publish Actors publicly for anyone to use
- Optional monetization via pay-per-event or usage-based pricing

---

## Platform limits

Key constraints to be aware of when designing solutions.

| Resource | Free plan | Starter | Scale | Business |
|---|---|---|---|---|
| Max memory per run | 8,192 MB | 32,768 MB | 32,768 MB | 32,768 MB |
| Concurrent runs | 25 | 32 | 128 | 256 |
| Max combined memory (all running jobs) | 8,192 MB | 32,768 MB | 131,072 MB | Contact support |
| Actors per account | 100 | 100 | 100 | 100+ |
| Tasks per account | 1,000 | 1,000 | 1,000 | 1,000+ |
| Schedules per account | 100 | 100 | 100 | 100+ |
| Webhooks per account | 100 | 100 | 100 | 100+ |
| Build timeout | 1,800 seconds | 1,800 seconds | 1,800 seconds | 1,800 seconds |
| Build memory | 4,096 MB | 4,096 MB | 4,096 MB | 4,096 MB |
| Metamorphs per run | 10 | 10 | 10 | 10 |
| Dataset columns (tabular export) | 2,000 | 2,000 | 2,000 | 2,000 |
| Input schema max size | 500 kB | 500 kB | 500 kB | 500 kB |

**Data retention:**
- Named storage: retained indefinitely
- Unnamed storage (free plan): 10 most recent runs retained for up to 4 months
- Unnamed storage (paid plans): retained per plan configuration

Organizations on paid plans can request limit increases by contacting Apify support.

---

## Solution design patterns

Common patterns for combining platform features to solve real-world problems.

### Periodic scraping with alerts

**Problem:** Monitor competitor prices daily and alert on changes.
**Solution:** Actor (scraper) + Schedule (daily cron) + Named dataset (historical data) + Webhook (Slack notification on completion)

### Multi-step data pipeline

**Problem:** Scrape data, clean it, and push it to a database.
**Solution:** Actor A (scraper) → Webhook → Actor B (data processor) → Integration (Snowflake/Airtable/custom API)

### Real-time API endpoint

**Problem:** Provide a live API that returns scraped data on demand.
**Solution:** Actor in Standby mode — receives HTTP requests, scrapes on demand, returns results immediately.

### Incremental crawling

**Problem:** Crawl a large site without re-visiting already-scraped pages.
**Solution:** Actor + Named request queue (shared across runs) + Schedule (periodic trigger). The queue persists visited URLs between runs.

### Geo-targeted data collection

**Problem:** Scrape region-specific content (local search results, geo-priced products).
**Solution:** Actor + Residential proxy with country/state targeting + Tasks (one per region with different proxy config)

### AI agent with web access

**Problem:** Give an AI agent real-time web scraping capabilities.
**Solution:** AI agent framework (LangChain/CrewAI/etc.) + Apify MCP server or `apify-client` + Store Actors for specific platforms

### Scraping at scale

**Problem:** Scrape millions of pages efficiently.
**Solution:** Orchestrator Actor (manages the workload) + Worker Actors (process batches) + Shared named request queue (work distribution) + Datacenter proxy (cost-effective IP rotation) + Monitoring (track success rates and costs)

---

## Documentation and resources

- **Platform docs:** [docs.apify.com](https://docs.apify.com)
- **LLM-friendly docs (quick):** [docs.apify.com/llms.txt](https://docs.apify.com/llms.txt)
- **LLM-friendly docs (full):** [docs.apify.com/llms-full.txt](https://docs.apify.com/llms-full.txt)
- **API reference:** [docs.apify.com/api/v2](https://docs.apify.com/api/v2)
- **Apify Store:** [apify.com/store](https://apify.com/store)
- **Apify Academy:** [docs.apify.com/academy](https://docs.apify.com/academy) — free courses on scraping, Actors, and platform usage
- **Actor whitepaper:** [github.com/apify/actor-whitepaper](https://raw.githubusercontent.com/apify/actor-whitepaper/refs/heads/master/README.md)
- **Pricing:** [apify.com/pricing](https://apify.com/pricing)

If the Apify MCP server is available, use `search-apify-docs` and `fetch-apify-docs` tools for contextual documentation lookups.
