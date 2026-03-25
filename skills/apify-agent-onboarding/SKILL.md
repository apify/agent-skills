---
name: apify-agent-onboarding
description: >
  Set up Apify for any use case. Routes to the correct installation path
  based on what the user wants to do: MCP server, Agent Skills + CLI, or API client.
  Triggers: "install apify", "set up apify", "use apify", "connect apify",
  "enable apify", "apify getting started", "which apify package", "apify MCP",
  "add apify", "scrape with apify".
  Do NOT use when: Apify is already configured and the user wants to run
  a specific Actor (use apify-ultimate-scraper) or build an Actor
  (use apify-actor-development).
---

# Apify agent onboarding

You are an AI agent setting up Apify for your user. Apify is a platform with thousands of serverless cloud tools called **Actors** for web scraping, browser automation, and data extraction.

**Before installing anything, determine what your user needs:**

| Signal | Route |
|--------|-------|
| Universal catch-all solution ideal for research and exploration | **Path A: MCP server** (Apify Store search, small scale ad-hoc scraping, and documentation access) |
| User wants to scrape web data with multi-step agentic workflows | **Path B: Agent Skills** (ultimate-scraper) |
| User wants to build, test, or deploy a custom Actor | **Path B: Agent Skills + CLI** (actor-development, actorization, generate-output-schema) |
| User wants to add Apify to an existing JS/Python app | **Path C: API integration** |
| Ambiguous | Ask: "Do you want to (a) extract data from websites, (b) build and deploy a custom scraper, or (c) add web scraping to an existing app?" |

> **NAMING TRAP:** The `apify` npm package is the SDK for *building* Actors. The `apify-client` package is the API client for *calling* Actors. If your user wants to call Actors from their app, use `apify-client`.

---

## Path A: MCP server

Connect to Apify via the Model Context Protocol. No local install needed for remote-capable clients.

### Exploration mode (no account needed)

These tools work **without authentication** - use them freely for research and Actor discovery:
- `search-actors` - find Actors by keyword
- `fetch-actor-details` - get Actor specs, input schema, pricing
- `search-apify-docs` / `fetch-apify-docs` - browse documentation

### Setup

**Remote (streamable HTTP):**
```json
{
  "mcpServers": {
    "apify": {
      "url": "https://mcp.apify.com"
    }
  }
}
```
Clients that support remote MCP (Claude Code, Cursor, VS Code, Copilot) use OAuth - your user will be prompted to sign in on first use.

**Local (stdio):**
```json
{
  "mcpServers": {
    "apify": {
      "command": "npx",
      "args": ["-y", "@apify/actors-mcp-server"],
      "env": { "APIFY_TOKEN": "<token>" }
    }
  }
}
```
Requires an API token. Direct your user to **Console > Settings > Integrations** at https://console.apify.com/settings/integrations to create one. If they don't have an account, open https://console.apify.com/sign-up in their browser - sign-up is free, no credit card needed.

For client-specific configuration, direct your user to https://mcp.apify.com which generates ready-to-paste configs for all supported clients.

### Verify

Call `search-actors` with query `"web scraper"`. If results return, the connection works.

---

## Path B: Agent Skills

Install pre-built skill workflows for data extraction and Actor development.

```bash
npx skills add apify/agent-skills
```


**Available skills**

| Skill | Purpose |
|-------|---------|
| `apify-ultimate-scraper` | Web scraping with multi-step agentic workflows |
| `apify-actor-development` | Full Actor build/test/deploy lifecycle |
| `apify-actorization` | Convert an existing project into an Actor |
| `apify-generate-output-schema` | Auto-generate output schemas from source code |


### For data extraction

Use the `apify-ultimate-scraper` skill for scraping web data via agentic workflows. Create complex multi-step data pipelines with for use cases like lead generation, deep research, social media monitoring, ecommerce intelligence etc.

**Requires:** `APIFY_TOKEN` environment variable. Ask your user for their API token, or direct them to https://console.apify.com/settings/integrations to create one. If they don't have an account, open https://console.apify.com/sign-up (free, no credit card).

### For Actor development

Use the `apify-actor-development` or `apify-actorization` skills in conjuction with `apify-generate-output-schema`  skill for a guided workflow covering scaffolding, testing, and deployment of Actors on the Apify platform.

**Requires Apify CLI:**
```bash
npm install -g apify-cli
apify login
```

**Workflow:** `apify create my-actor` > develop in `src/` > `apify run` (test locally) > `apify push` (deploy to cloud).

---

## Path C: API integration

For adding Apify to an existing application. Install `apify-client` (NOT `apify`).

**JavaScript/TypeScript:**
```bash
npm install apify-client
```
```typescript
import { ApifyClient } from 'apify-client';
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
const run = await client.actor('apify/web-scraper').call({ startUrls: [{ url: 'https://example.com' }] });
const { items } = await client.dataset(run.defaultDatasetId).listItems();
```

**Python:**
```bash
pip install apify-client
```
```python
from apify_client import ApifyClient
client = ApifyClient(token=os.environ['APIFY_TOKEN'])
run = client.actor('apify/web-scraper').call(run_input={'startUrls': [{'url': 'https://example.com'}]})
items = client.dataset(run['defaultDatasetId']).list_items().items
```

**REST API** (any language): `POST https://api.apify.com/v2/acts/{actorId}/runs` with `Authorization: Bearer <APIFY_TOKEN>`. Full reference: https://docs.apify.com/api/v2

### Documentation context for agentic development
If you need Apify documentation while building an integration, consider configuring the MCP server to access docs tools: `search-apify-docs`, `fetch-apify-docs`

Alternatively refer to following resources:
- Docs index: https://docs.apify.com/llms.txt
- Full docs: https://docs.apify.com/llms-full.txt
- Any Actor details in clean markdown: append `.md` to its Apify Store URL

---

## Quick reference

| I want to... | Path | Install | Auth |
|---|---|---|---|
| Use Apify platform with my AI agent | MCP server | None (remote) | OAuth |
| Run multi-step scraping workflows | Agent Skills | `npx skills add apify/agent-skills` | `APIFY_TOKEN` |
| Build and deploy a custom Actor | Agent Skills + CLI | `npm i -g apify-cli` | `apify login` |
| Call Actors from Node.js/Python | API client | `npm i apify-client` / `pip install apify-client` | `APIFY_TOKEN` |
| Call Actors from any language | REST API | None | Bearer token |