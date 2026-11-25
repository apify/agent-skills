# Mapping the pricing: from a pricing page to Actor events

## Contents

1. How money flows on Apify
2. Read the partner's pricing
3. Pick the pricing basis
4. Design the events
5. Count usage correctly
6. Set the price level
7. Worked examples
8. `pricing.json` format
9. Rules Apify applies to events

## 1. How money flows on Apify

The Actor uses pay-per-event (PPE) pricing: the code tells the platform "charge this caller N of event X", and the platform bills the caller the event's price. For a multi-tenant Server Actor:

| Caller | Pays | Owner receives | Platform usage of the run |
| --- | --- | --- | --- |
| On a paid Apify plan | The event prices | 80% of the event revenue | Deducted from the owner's payout |
| On the free Apify plan | The event prices, from the free monthly credit | Nothing | Covered by Apify |
| The owner | Nothing | Nothing | Charged to the owner |

So: `payout = 0.8 x event revenue from paying users - platform usage of the runs that served them`.

Platform usage for a thin wrapper is small: a 256 MB run costs about $0.05 per hour while it is alive, which lands around $0.05 to $0.10 per 1,000 requests. `npm run pricing` estimates it from the assumptions in `pricing.json`. It matters only for events priced well under $0.001.

The partner's real cost is the upstream call itself, and the free-plan row is where that bites: free-plan callers consume the partner's API and bring no payout. Each free account can spend at most its free monthly credit (about $5) on the Actor. The policy (`allow`, `limit` per day, `block`) is the partner's decision. Draft a default (a small daily `limit` works as a trial allowance when each call has a real upstream cost) and present the options in `LAUNCH.md`. The partner changes it without code through the `FREE_USERS_POLICY` and `FREE_USERS_MAX_REQUESTS_PER_DAY` environment variables in `.actor/actor.json`; `limits.freeUsers` in `src/config.js` is only the fallback. Apify asks that limits on free users are stated up front in the README.

Source: [Monetize multi-tenant Server Actors](https://docs.apify.com/actors/monetize/server-actors), [Actor pricing and costs](https://docs.apify.com/actors/monetize/pricing-and-costs).

## 2. Read the partner's pricing

Read both the pricing page and the docs, because they answer different questions:

- **Pricing page**: plans, monthly prices, included quotas, pay-as-you-go rates, the price of a credit.
- **Docs** (search for "credits", "billing", "usage", "rate limits", "pricing" in `llms.txt` or the docs search): how many units each endpoint and option consumes, and when a call is billed.

Pricing pages are often rendered by JavaScript or hide numbers behind a toggle or slider. If a fetch returns no numbers:

1. Try the page's Markdown variant (`<url>.md`) or the docs' `llms-full.txt`.
2. Search the raw HTML for embedded data: `__NEXT_DATA__` or other JSON in `<script>` tags, `data-` attributes, and the JavaScript bundles the page loads (`grep -o '\$[0-9][0-9.,]*'` finds candidates fast).
3. Use a browser tool, or a web search for the vendor's pricing.
4. Ask the user to paste the numbers.

Do not fill gaps from memory: prices change, and a remembered price is a guess.

Record for every exposed endpoint:

1. **Unit**: what one unit of billing is (a call, a credit, a result, a page, 1,000 tokens, a character, a second of audio).
2. **Units per call**: fixed (1 call = 1 credit), fractional (5 URLs = 1 credit, a verification = 0.5 credit) or variable (depends on options, on the number of results, on input size).
3. **Price per unit**, and under which plan.
4. **Billing rule**: are failed calls billed? Calls with no results? Repeats of the same lookup? Calls still in progress (202)? Is there a minimum?

Keep the source URL and the date for each number. They go into `pricing.json` and `LAUNCH.md`.

When sources disagree on a rule (the pricing page FAQ says one credit per result, the API reference says one per 10 results), prefer the API reference or the billing docs, because they describe what the API bills. Draft on it, quote both, and list the conflict as a decision for the partner. Leave an endpoint out only when no source gives a usable rule, not merely because two sources disagree.

## 3. Pick the pricing basis

A subscription API rarely has one price per call. The question to answer is: *what does a new customer pay per unit on the cheapest way to start paying, with no long commitment?* In practice, in this order:

1. **A standalone pay-as-you-go rate**, if anyone can buy units without a paid plan (one that works on top of the free plan counts). It is the same promise Apify makes.
2. **The effective rate of the entry paid plan, billed monthly**: monthly price divided by included units. Ignore annual-only discounts.
3. **A mid-tier rate**, only if the partner says that is where their typical customer sits.

The order is a guide, the question decides. When they disagree (for example a standalone prepaid API-credit product priced at twice the entry plan's rate), draft on the rate that answers the question, and put the other in `LAUNCH.md` as an alternative with both numbers.

Not a basis on their own: top-ups, extra-credit packs and "pay-as-you-go" that is only available on top of a paid plan (they are the marginal price for existing subscribers, usually above the plan rate), enterprise quotes, and the free tier (Apify's free plan credit plays that role). They are still useful context: if the entry plan rate and the top-up rate differ a lot, put both in `LAUNCH.md` and let the partner choose.

State the basis in one sentence in `pricing.json` (`upstream.basis`) and in `LAUNCH.md`, for example: "Starter plan billed monthly, $49 for 2,000 credits = $0.0245 per credit; Email Finder = 1 credit." The partner may prefer another basis. Making it explicit lets them change it in a minute. Convert other currencies to USD at the current rate and note the rate and date.

If no per-unit price can be derived (enterprise "contact us" only, or a flat fee with unlimited use), do not make one up. Offer the partner two starting points: a cost-plus price (their cost per call plus margin) or the price of comparable Actors in Apify Store, and mark the price as an open decision.

## 4. Design the events

**One event per thing the partner charges a distinct price for.** The Pricing tab of the Actor should read like the partner's pricing page, and a typical call must cost the same on Apify as direct.

| Partner's pricing | Events | Route setting |
| --- | --- | --- |
| Same price for every call | One event, e.g. `api-call` | `count` omitted |
| Different price per endpoint | One event per endpoint, e.g. `search`, `extract` | `count` omitted |
| Whole credits, fixed per endpoint | Events named after the endpoints, priced at credits x credit price | `count` omitted |
| Whole credits, variable per call (depends on an option) | One `credit` event at the price of a credit | `count: (ctx) => credits` |
| **Fractions of a credit** (5 URLs = 1 credit, verification = 0.5 credit) | One event per unit the fraction is about, priced at credit price x fraction: `extracted-url` at 1/5 credit | `count: (ctx) => units` |
| Per result, record or page returned | One event per result type, e.g. `search-result` | `count: (ctx) => number of results` |
| Per token, character, second, MB | One event for a bundle of units, e.g. `tokens-1k` | `count: (ctx) => units / bundle size` (rounded up) |
| Several prices in one call (map + extract, input + output tokens) | One event per price, all on the route | `event: ['a', 'b']`, `count: (ctx) => ({ a: n, b: m })` |

When to split and when to count: use separate events when a per-call price means something to users (basic vs advanced search, a find vs a verification) or might be repriced on its own; it reads better on the Pricing tab. Use one `credit` event with a `count` when the cost really varies with input size or several options at once.

Why fractions get their own event: the Actor charges whole events per call, and the partner adds fractions up across calls. One `credit` event with `Math.ceil(urls / 5)` turns a 1-URL extract into a full credit, five times the direct price. An `extracted-url` event at a fifth of a credit charges exactly what the partner would.

Guidelines:

- **Few events.** Aim for 1 to 5, stay under 10. Endpoints that cost the same and mean the same to a user can share an event. Do not merge endpoints with different prices into an average.
- **Name events for the user.** `search`, `page-scraped`, `company-lookup`, lower-case with hyphens. The title and description appear on the Pricing tab: say what one event is and which endpoint charges it.
- **One primary event**: the one that best represents what the product does. It is highlighted in Store.
- **Free routes** (`event: null`) for status, metadata, and polling for a result that was already paid for.
- **Whole events only.** `count` is rounded up per call. Choose the unit so that rounding is small for a typical call.
- **Price precision.** Keep prices at or above $0.00001 and at most 6 decimals.
- **Mirror the billing rule.** Default: charge when the upstream answers 2xx. If the partner does not bill some 2xx answers (202 "still running", empty results, vendor codes) or does bill some errors, mirror that with `count` and `chargeOn`, and say it in the event description.
- **Do not charge `apify-` events from the code.** The synthetic `apify-actor-start` and `apify-default-dataset-item` events are charged by the platform to the owner of a run. In multi-tenant server requests that is the partner, not the caller, so they never bill callers there. `apify-actor-start` does apply to runs a user starts from the input form, which is fine to keep at its default price. Remove `apify-default-dataset-item`, because the Actor charges its own events.

## 5. Count usage correctly

A count that is wrong by a factor charges every caller wrongly, so check the source of every number.

- **Published rule from the request** (`body.search_depth === 'advanced' ? 2 : 1`): predictable, always available, and what the caller can work out from the pricing table. The safe default. One exception: if the API can choose a costlier option on its own (an `auto` mode that may switch to advanced), read the option the API actually used from the response, and let an explicit request value win when the response does not say.
- **Count from the response** (number of results, successful URLs): right when the partner bills what was delivered.
- **Usage the API reports** (a `creditsUsed` field, an `X-Credits-Used` header): exact when it is per call. Before you use it, check two things in the docs and in a sample response:
  - **Per call or cumulative?** Some APIs report the account's running total, or a value that stays 0 until a threshold. Under a shared key that is everyone's usage, not this call's.
  - **Does the API discount per account?** If repeats of the same lookup are free for the same account within a billing period, or cached answers are free, the reported usage is 0 for every caller after the first. Charge by the published rule instead, and say so in `LAUNCH.md`. Two reasons: the partner would give away every repeat to strangers, and the charged count would tell a caller whether someone else already looked up the same person or domain, which leaks other callers' activity.
  Read a header with `ctx.upstream.headers.get('x-credits-used')`, and give the example a `mockHeaders` so the smoke test exercises it.
- **Async jobs** (a crawl billed per page as it runs, a research task that costs 4 to 250 credits): the price is only known while or after the job runs, the caller polls a status endpoint any number of times, and there are no refunds. Options, best first:
  1. **Prepay a capped amount at submission.** Require the parameter that caps the job (`limit`, `max_pages`), cap every option that changes the cost per item, and charge `limit x price per item` when the job is accepted. Polling is free. Simple and safe for the partner, but a caller who sets `limit: 500` on a 120-page site pays for 500, so say so in the README and in `LAUNCH.md`.
  2. **A fixed price per job**, if the partner can name one.
  3. **Leave the endpoint out** of the first version, and point callers to the synchronous endpoints that cover the same need.
  4. **Exact billing** needs state: run the job through the Actor's input interface (a normal run that waits for the job and charges at the end), or record charged job IDs in the Actor's key-value store. Both are custom code beyond the template.
  Always add an `undo` that cancels the job, for the case where the call was accepted upstream but could not be charged. Never charge on a status poll.

## 6. Set the price level

Two defensible defaults. `npm run pricing` prints both for every event.

| Strategy | Event price | Partner nets | When |
| --- | --- | --- | --- |
| **Parity** (default) | = the partner's direct price | 80% of direct, minus platform usage | The partner treats Apify's 20% as the cost of a channel that brings users and billing with no acquisition cost. "Same price as direct" is the simplest message. |
| **Gross-up** | = direct price / 0.8 (+25%) | 100% of direct, minus platform usage | The partner cannot give up margin. Users pay more than direct, which is visible to anyone who compares. |

Draft with parity unless told otherwise, set `"strategy"` in `pricing.json` accordingly, and present the other as the alternative in `LAUNCH.md`. It is the partner's decision. If the partner sells the same API through another per-call channel (an x402 endpoint, another marketplace), find that price too: a gap between channels is a question for the partner.

**Discount tiers.** Apify users belong to a tier by their Apify plan (FREE, BRONZE, SILVER, GOLD, plus PLATINUM and DIAMOND for enterprise), and an event can have a price per tier. Default to one flat price. If the partner has volume discounts, the Apify tiers are the only lever, and they follow the user's Apify plan, not their volume with the partner, so treat tier prices as a loyalty discount (for example 5% and 10% off for SILVER and GOLD), not as a copy of the partner's volume table. Do not raise the FREE tier price above the others except to cover real third-party cost: it blocks trial.

**Price changes after launch.** Lowering a price or removing an event is immediate. Raising a price, adding a paid event or changing the model is a "significant change": once the Actor has paying users it takes effect after 14 days' notice, cannot be cancelled, and is allowed once a month per Actor. Before the Actor has paying users, changes are immediate. This is why the launch prices deserve care.

## 7. Worked examples

The numbers below are made up to show the shapes. Always take prices and rules from the partner's own pages.

**Credits, with an option and fractions** (a search-and-extract API). Pay-as-you-go $0.01 per credit. Basic search 1 credit, advanced search 2. Extract: 1 credit per 5 successful URLs, doubled with advanced depth.

- `search` at $0.01 and `advanced-search` at $0.02, chosen by the request's depth (or by the depth the response reports, if the API can pick it).
- `extract` route, event `extracted-url` at $0.002 (a fifth of a credit): `count: (ctx) => (ctx.upstream.json()?.results?.length ?? 0) * (ctx.request.json()?.extract_depth === 'advanced' ? 2 : 1)`. Counting successful results mirrors "you are not charged for failed URLs".
- Examples: basic and advanced search; extract with 1 URL, with 7 URLs, with a failed URL, and advanced.

**Fixed credits per product, some fractional** (a contact-data API). Entry plan $40 per month for 1,000 credits = $0.04 per credit. A found contact costs 1 credit, a verification 0.5, an enrichment 0.2.

- `contact-found` at $0.04 with `count: (ctx) => (ctx.upstream.json()?.data?.email ? 1 : 0)`.
- `verification` at $0.02 and `enrichment` at $0.008. The verifier bills only some outcomes, so `chargeOn` checks both the status code (it answers 202 while still running, and a vendor 2xx code for a failed check) and the result field, and every outcome gets an example with `mockStatus`.
- If the partner does not bill repeat lookups per account, note in `LAUNCH.md` that the Actor charges each call by the published rule, and why.

**Subscription only.** Plans: $50 for 5,000 searches, $130 for 15,000, no overage sold. Basis: entry plan, $50 / 5,000 = $0.01 per search. One event `search` at $0.01, primary. Note in `LAUNCH.md` that the next plan works out to $0.0087 and the partner may prefer it.

**Per result.** $2 per 1,000 records returned, empty searches free. One event `record` at $0.002 with `count: (ctx) => ctx.upstream.json()?.data?.length ?? 0`. A call with no records counts 0 and charges nothing.

**Per character.** $20 per 1 million characters translated. Bundle per 1,000: event `characters-1k` at $0.02, `count: (ctx) => (ctx.request.json()?.text?.length ?? 0) / 1000`. A 300-character call still charges one whole event, so if typical calls are short, bundle per 100 characters ($0.002) instead to keep the rounding small.

**Two prices in one call.** A crawl billed as 1 credit per mapped page plus 1 credit per 5 extracted pages: `event: ['mapped-page', 'extracted-page']`, `count: (ctx) => ({ 'mapped-page': body.mapped, 'extracted-page': body.extracted })`.

## 8. `pricing.json` format

```json
{
    "upstream": {
        "product": "Acme Search",
        "pricingUrl": "https://acme.dev/pricing",
        "retrievedOn": "2026-11-24",
        "basis": "Pay-as-you-go: $0.008 per credit. Basic search = 1 credit, advanced = 2, extract = 1 credit per 5 URLs."
    },
    "strategy": "parity",
    "assumptions": { "memoryMbytes": 256, "avgRequestSecs": 1.5, "avgResponseKb": 20, "utilization": 0.3 },
    "events": {
        "credit": {
            "title": "Search credit",
            "description": "One Acme credit used by a search. Basic search = 1, advanced search = 2.",
            "upstreamPriceUsd": 0.008,
            "priceUsd": 0.008,
            "primary": true
        },
        "extracted-url": {
            "title": "Extracted URL",
            "description": "One URL extracted successfully (a fifth of a credit). Advanced extraction counts 2. Failed URLs are free.",
            "upstreamPriceUsd": 0.0016,
            "priceUsd": 0.0016
        }
    }
}
```

- `upstreamPriceUsd`: what a direct customer pays the partner for the same unit. `priceUsd`: what an Apify user pays per event.
- For tier prices, replace `priceUsd` with `"tieredPriceUsd": { "FREE": 0.008, "BRONZE": 0.008, "SILVER": 0.0076, "GOLD": 0.0072 }`.
- `assumptions` feed the platform-usage estimate. Set `avgRequestSecs` to the API's typical latency.
- The file is the single source for the README table (`npm run pricing -- --readme`), the Console setup (`-- --console`) and the API payload (`-- --api`). Event names must match `event` in `src/config.js`. `npm run check` enforces it.

## 9. Rules Apify applies to events

- An event must be defined in the Actor's monetization settings before the code can charge it. Charging an unknown event charges nothing, and the template then refuses to return the result (`onChargeFailure: 'fail'`).
- What the platform does when a multi-tenant caller cannot afford a charge (for example a large prepaid job) is not documented. The template treats any charge that does not go through as a failed call and runs the route's `undo`. Verify the behavior with a second account before launch.
- In a multi-tenant run every charge must carry the request's ID (`X-Actor-Request-ID`) and must happen before the response ends. The template does both. Since `apify` 3.8.0 the SDK's `Actor.charge({ eventName, count, requestId, idempotencyKey })` handles this; older SDK versions and some docs pages call the charge endpoint directly.
- Requests from the Actor's owner are not charged. Billing can only be observed with a second account.
- Sources: [Pay-per-event pricing model](https://docs.apify.com/actors/monetize/pay-per-event), [Set up Actor monetization](https://docs.apify.com/actors/monetize/set-up-monetization), [Charge events in Actor run](https://docs.apify.com/api/v2/post-charge-run).
