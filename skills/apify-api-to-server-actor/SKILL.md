---
name: apify-api-to-server-actor
description: Turn an existing HTTP API into an Apify Server Actor that works as a thin, pay-per-call wrapper around it, so a company can sell its API on Apify Store as a distribution channel. Reads the API's endpoints (OpenAPI spec or docs) and its pricing page, maps the upstream price of each call to Apify pay-per-event events, and produces a tested Actor project with per-request charging, endpoint schema, README, pricing file and a launch plan. Use whenever someone wants to wrap, proxy, resell, list or publish a third-party or partner API (REST, SaaS, data or AI API) as an Apify Actor, Server Actor or Standby Actor, asks how to price API calls with Actor events or match an API's pricing on Apify, or wants to bring a partner's product to Apify Store, even if they do not say "Server Actor". Not for scrapers or other Actors (use apify-actor-development), and not for wrapping an MCP server (use the ts-mcp-proxy or python-mcp-proxy template).
---

# API to Apify Server Actor

Build an Actor that puts an existing API in front of Apify users: they call it with their Apify token, pay per call through their Apify account, and never need an account with the API's vendor. The vendor (the "partner") owns the Actor, keeps its API key in it, and gets the payout.

```
Apify user --Apify token--> Apify platform --> Server Actor (partner's account) --partner's API key--> partner's API
              pays per event                    forwards the call, charges the caller
```

A [Server Actor](https://docs.apify.com/actors/running/server-actors) (formerly Actor Standby) answers HTTP requests in real time at a stable URL. In multi-tenant mode it runs in the owner's account, serves all users from shared warm runs, and bills each request to its caller with pay-per-event pricing. That is what makes a thin API wrapper viable: no cold start per call, no runs in the user's account, a price per call.

The skill bundles a working, tested Actor template in `assets/actor-template/`, built for multi-tenant use: it charges every request to its caller with the request ID, keeps the partner's key in the partner's runs, tells callers apart by their Apify user ID, and binds async jobs to the caller who started them. Tenancy itself is a platform setting the owner switches on after monetization (step 8). The wrapper is defined in one file, `src/config.js`. Your job is the part that differs per API: choosing the endpoints, getting the prices right, and proving both. Do not rewrite the plumbing.

## Setup

Building and testing the Actor needs only Node.js 22 or later: the template's scripts have no dependencies and run against a mock of the API. The Apify CLI is needed for deploying (step 8) and for running the server locally with the real SDK:

```bash
apify --help   # CLI installed?
apify info     # logged in? prints your username
```

Install with a package manager, `npm install -g apify-cli` or `brew install apify-cli`. Log in with `apify login`: it prints a URL and a one-time code and waits until the user approves it in a browser, so show the user both. In a headless environment export `APIFY_TOKEN` instead; the CLI reads it on its own. Pass tokens and API keys only through the environment or a secret, never through files, source or the conversation.

### Telemetry attribution (required)

Pass `--user-agent apify-agent-skills/apify-api-to-server-actor` on **every** `apify` command you run from this skill: `apify run`, `apify push`, `apify api`, `apify secrets add` and the rest. It only tags the call for telemetry attribution and changes nothing else.

### Related skills

- `apify-actor-development` covers Actors in general, including Server Actors that are not API wrappers.
- `apify-actor-runtime` runs the finished Actor on a local Apify platform, when the smoke test's mock is not enough.

## What you need

- **The API**: an OpenAPI/Swagger document, a docs URL, or just the product name (then find the docs).
- **The pricing**: the public pricing page, plus any docs page on credits, units or billing.
- **Not needed to build**: an upstream API key or an Apify account. The Actor is built and tested against a mock of the API. Keys only come in at launch, and the partner enters them, not you.

If the user gave a product name only, find the docs and pricing yourself. Ask the user only for what you cannot find, or for prices that are not public.

## Workflow

### 1. Map the API

Read [references/endpoint-selection.md](references/endpoint-selection.md). Get the machine-readable API description if one exists (look in `llms.txt` first: it often links the OpenAPI file), and list every endpoint with its method, path, purpose, auth and side effects.

Sort each endpoint into **expose**, **expose with caller isolation** (async jobs, anything created by one call and read by another), or **leave out** (account, billing, keys, team, webhooks, anything that reads or changes the key owner's own data). Do the same for parameters: a parameter that reads the owner's data or turns on a side effect in the owner's account must be dropped or forced off. Everyone shares the partner's one API key, so an endpoint is safe only if a stranger may call it. When unsure, leave it out and list it as an open question.

### 2. Map the pricing

Read [references/pricing-mapping.md](references/pricing-mapping.md). Read the pricing page and the billing docs, and write down for every exposed endpoint: the unit the partner bills (call, credit, result, token, page), the price per unit, and the rule for when it is billed (success only? empty results? repeats? fractions of a credit?).

Turn that into events: one event per thing the partner charges a distinct price for, so the Actor's Pricing tab reads like the partner's own pricing page. Default to **price parity** (event price = the partner's public pay-as-you-go price). Then check the result call by call: a typical small call must cost on Apify what it costs direct. Rounding fractional credits up per call is the usual way this goes wrong.

Quote the source for every price (URL and date). Never invent a price. If the pricing is not public or you cannot derive a per-unit price, say so and ask.

### 3. Confirm the plan

Show the user one table before building: endpoint, exposed or not and why, event, count per call, upstream price, Actor price, source. Add the pricing basis in a sentence and the decisions you made on their behalf.

Wait for a go-ahead if the user is there to give one. If they asked for a hands-off build, or cannot be asked, go on with the defaults and record every assumption as an open decision in `LAUNCH.md`. A wrong endpoint or price is cheap to fix now and expensive after launch (price increases take 14 days once the Actor has paying users).

### 4. Scaffold

```bash
cp -r <this-skill>/assets/actor-template <target-dir>/<actor-name>
```

Name the Actor after the product (`acme-search-api`). Save the partner's OpenAPI file (and any pricing or docs pages you relied on) in `<actor-dir>/upstream/`; it is excluded from the Actor image. Then edit:

| File | What to do |
| --- | --- |
| `src/config.js` | `upstream` (base URL, auth, `ownerErrorStatuses`), one `routes` entry per exposed endpoint, `limits`. The file documents every option. |
| `pricing.json` | Source of the prices (`upstream`), the events with `upstreamPriceUsd` and `priceUsd`, exactly one `primary`. |
| `.actor/actor.json` | `name`, `title`, `description`, `meta.generatedBy`, and the drafted free-plan policy (`FREE_USERS_POLICY`, `FREE_USERS_MAX_REQUESTS_PER_DAY`). Leave `usesStandbyMode`, the secret reference and the memory limits. |
| `.actor/input_schema.json` | Prefill `path`, `method` and, for a POST endpoint, `body` with a real, cheap call of this API. For a GET-only API, remove the `body` field and trim the method list. |

Routing rules that matter:

- **Keep the partner's paths.** Expose `/v1/search` as `/v1/search`, so the partner's docs and examples carry over and only the base URL and the token change.
- **Give every route `examples`**: one per price branch (basic vs advanced, results vs no results), one per non-200 answer priced differently (`mockStatus`), and one per validation rule (`expect: { status: 400, upstreamCalls: 0 }`). Each has a realistic `mockResponse` and an `expect` of what it should charge, plus `upstreamBody` / `upstreamBodyLacks` when a hook changes the body. Use real, cheap inputs so `smoke -- --live` means something. The smoke test runs every example, so the examples are what prove the prices.
- **Usage-based prices** use `count: (ctx) => ...`. Default to the partner's published rule (from the request or the delivered results). Use a usage figure the API reports only after checking that it is per call (not an account-wide running total) and that the API does not discount repeats per account, which under a shared key would give repeats away and reveal other callers' lookups. See the pricing reference.
- **Several prices in one call** (a crawl that costs map plus extract): `event: ['mapped-page', 'extracted-url']` with `count` returning `{ 'mapped-page': n, 'extracted-url': m }`.
- **Charge what the partner charges for.** The default bills any 2xx answer. Check the API's 2xx codes (202 "still running", vendor codes) and set `chargeOn` when the partner bills differently.
- **Owner errors stay private.** List the statuses that mean "the partner's key or account has a problem" in `upstream.ownerErrorStatuses` (401 and 402 by default, plus vendor codes like plan-limit errors). Callers get a neutral 503 and are not charged.
- **Async jobs** need caller-bound IDs: sign the ID in the creating route, list the path parameter in `ownedParams` in the reading routes. See `src/ownership.js`.
- **Validation in hooks**: throw `new HttpError(400, 'type', 'message')` from `transformRequest` to reject a call (for example a too-large `limit`) before it reaches the API.
- **Never put the API key in a file.** It reaches the Actor as the `UPSTREAM_API_KEY` secret.

Do not edit `pipeline.js`, `server.js`, `main.js` or the scripts unless the API needs something the config cannot express. If you do, say so in your report and keep `npm test` passing.

### 5. Generate the endpoint schema

```bash
npm run openapi -- --upstream upstream/openapi.json --docs-base https://docs.partner.com
```

It writes `.actor/openapi.json` (the Server tab in Console and Store, and what AI agents read to call the Actor) from the routes. Operations are copied from the partner's OpenAPI file with the partner's authentication, credential parameters, owner-error responses and vendor code samples removed, and each gets its price. Then **review the copied text**: vendor descriptions often promise things that are not true through a shared key ("saved to your leads", "counts against your plan"). Fix them, and fill in routes the partner's file does not cover, through each route's `openapi` field, which is merged in on every regeneration. Never hand-edit `.actor/openapi.json`: the next run overwrites it.

### 6. Write the README and the launch plan

- `README.md` is the Actor's Store page. Replace every `TODO`. Lead with what the API does and for whom, then the quick-start call, endpoints, and the pricing table from `npm run pricing -- --readme`. The Actor URL stays a placeholder until the first deploy. Do not promise anything that only becomes true after a launch step (for example "your lookups are not saved" when that needs an account setting the partner has not changed yet): word it conditionally, or keep the promise out until the step is done.
- `LAUNCH.md` is the handover to the partner: the endpoint and price table with sources, what was left out and why, what they earn, the decisions that are theirs, and the go-live steps. Fill in the facts and trim the decision list to what is really open.

### 7. Verify

```bash
cd <actor-dir>
npm run check      # routes, pricing, schema and actor.json agree; no placeholders, leftovers or credentials
npm run smoke      # every route and example against a mock upstream: forwarding, key handling, exact charges
npm run pricing    # what users pay and what the partner keeps, per event
```

All three run without installing anything. Fix every error from `check` and every failure from `smoke`, and resolve the warnings or be ready to explain them. If the vendor publishes a test key or a keyless tier, a few live calls with it are a free check of paths and auth (see the endpoint reference). If the user has an upstream key, `UPSTREAM_API_KEY=... npm run smoke -- --live` makes one real call per example (it uses real quota, so ask first). To try the server by hand: `npm install`, then `apify run` (or `npm start`) and `curl localhost:4321/`.

### 8. Deploy, only when asked

Deploying, setting prices and publishing change a live account and are the owner's call. Do them only when the user asks and is logged in to the account that will own the Actor. The steps, in the order that matters (deploy, server settings, monetization, switch to multi-tenant, publish), are in [references/deploy-and-monetize.md](references/deploy-and-monetize.md) and in the project's `LAUNCH.md`.

### 9. Report

End with: the path of the project, the endpoint/event/price table, the pricing basis and its source, what you verified (and what you could not, such as live calls or deployment), and the open decisions for the partner. Keep it short; `LAUNCH.md` has the detail.

## Things that go wrong

- **Exposing too much.** One shared key means every exposed endpoint and parameter is public to all Apify users. Account, usage, billing and key endpoints leak the partner's own data. When in doubt, leave it out.
- **Guessing prices.** A plausible but wrong price is worse than a question. Use the page, quote it, date it.
- **Rounding a fraction of a credit up to a whole one per call.** If 5 URLs cost 1 credit, a 1-URL call must not cost a full credit. Price an event per URL at a fifth of a credit instead.
- **Trusting reported usage blindly.** Some APIs report account-wide running totals, or bill a repeat lookup once per account. Under a shared key both undercharge or overcharge callers. Check before you use it.
- **Charging before the result exists.** The pipeline charges after the upstream call succeeds and before it answers. Keep it that way: no result, no charge, and no charge, no result.
- **Deciding the free-plan policy for the partner.** Free-plan users pay from Apify's free credit and the owner earns nothing, while their calls still hit the partner's API. Whether to allow, limit or block them is the partner's decision: draft a default, list it as a decision in `LAUNCH.md`, and state it in the README. The partner changes it with `FREE_USERS_POLICY` and `FREE_USERS_MAX_REQUESTS_PER_DAY` in `.actor/actor.json` (or Console), without touching code.
- **Treating the mock test as a live test.** `npm run smoke` proves the wrapper, not the partner's API. Say which one you ran.

## Platform facts

[references/server-actors.md](references/server-actors.md) has the facts the template relies on (tenancy, who pays what, request IDs, limits, the charge API) with links to the Apify docs. Read it when you need to explain or debug behavior, or when the user asks how Server Actors work. Apify's docs change: for anything that matters at launch, check the linked page (append `.md` to any docs URL for Markdown, or use the Apify MCP server's `search-apify-docs`).
