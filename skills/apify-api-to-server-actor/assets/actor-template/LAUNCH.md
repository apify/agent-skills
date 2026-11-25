# Launch plan: TODO Product on Apify

Status: TODO draft built and tested against a mock of the API on TODO date. Not deployed.

This file is the handover from "the Actor exists" to "the Actor earns". It records what was decided, what is still open, and the steps to go live. It is not part of the Actor image.

## What this Actor is

A thin wrapper that exposes TODO N endpoints of the TODO Product API as an [Apify Server Actor](https://docs.apify.com/actors/running/server-actors). Apify users call it with their Apify token and pay per call through their Apify account. TODO Company holds the Actor, the upstream API key and the payout.

```
Apify user  --Apify token-->  Apify platform  -->  this Actor (your account)  --your API key-->  TODO Product API
              charged per event                    charges the caller, adds the key
```

## Endpoints and prices

TODO One row per route. Direct price = what a customer pays TODO Product for the same call today.

| Endpoint | Event | Count per call | Direct price | Price on Apify | Source |
| --- | --- | --- | --- | --- | --- |
| `GET /v1/items/{id}` | `item-lookup` | 1 | $0.004 | $0.004 | TODO pricing page, pay-as-you-go |

Price basis: TODO which published rate was used and why (pay-as-you-go rate, a named plan divided by its quota, overage rate). Read from TODO URL on TODO date.

Left out on purpose: TODO endpoints not exposed and why (account management, endpoints that act on the key owner's data, endpoints with no clear price).

## What you earn

Run `npm run pricing` for the current numbers.

- Users on paid Apify plans: you receive 80% of the event revenue, minus the platform usage of the runs that served them (TODO estimate per 1,000 requests).
- Users on the Apify free plan: they pay from their free credit, you receive nothing, Apify covers the platform usage. Their calls still use your API. The free-plan policy below decides how much of that you allow.
- Your own calls: not charged.

## Decisions for TODO Company

TODO Keep only the ones that are still open, and put the recommended option first.

1. **Price level.** Parity with the direct price (you net 80%) or grossed up by 25% (you net 100%, Apify users pay more than direct customers). Drafted as: TODO.
2. **Free-plan users.** Your call: allow them, limit them to a number of paid calls per day, or block them. Drafted as TODO. Each free Apify account can spend at most its monthly free credit (about $5) on this Actor, and none of it reaches your payout. You can change this at any time without touching code: set `FREE_USERS_POLICY` (`allow`, `limit` or `block`) and `FREE_USERS_MAX_REQUESTS_PER_DAY` in `.actor/actor.json` and run `apify push`, or edit them in Apify Console > Actor > Source > Environment variables and rebuild. If you use Console, also update `actor.json`, because the next `apify push` writes the file's values back. Update the README's Limits section to match.
3. **Rate limits per user.** Drafted as TODO requests per minute and TODO concurrent. Your API key's own limit is TODO.
4. **Endpoints.** TODO anything left out that you want in, or the reverse.
5. **Discounts for higher Apify tiers.** Flat price for everyone (drafted), or lower prices for Silver and Gold users.

## Go live

Do the steps in this order. Steps 1 to 4 can be done by an agent with the Apify CLI, steps 5 to 8 are in Apify Console and need the account owner.

0. **Prepare the partner's account.** A dedicated account or key for the Actor, rate limits sized for Store traffic, a spending cap that will not cut everyone off, and every account-level side effect switched off (TODO list them, e.g. "save results as leads"). These are launch blockers.
1. **Log in** to the Apify account that will own the Actor and receive the payout: `apify login`.
2. **Store the upstream API key as a secret.** Run this yourself in a terminal, so the key never appears in a chat or a file: `apify secrets add upstreamApiKey <your-key>`. Use a key created for this Actor only, so it can be rotated or revoked on its own.
3. **Verify against the real API**, if not done yet: `UPSTREAM_API_KEY=<your-key> npm run smoke -- --live`. It makes one real call per endpoint.
4. **Deploy**: `apify push`. Then call the Actor with your own Apify token:
   `curl -H "Authorization: Bearer $APIFY_TOKEN" https://<username>--<actor-name>.apify.actor/`
   Your own calls are free and are not charged, so this tests the wrapper, not the billing.
   Then replace the `<username>--<actor-name>` placeholder in `README.md` with the real URL from the Server tab and push again.
5. **Set the server configuration**: Console > Actor > Settings > Server. TODO adjust to this API: 256 MB, idle timeout 300 s and desired 20 / max 50 requests per run suit small JSON answers; raise memory and lower the requests per run when answers run to several MB or are parsed by the Actor.
6. **Set up monetization**: Console > Actor > Publication > Monetization. `npm run pricing -- --console` prints exactly what to enter. This needs your billing and payout details filled in.
7. **Switch to multi-tenant**: Console > Actor > Settings > Server > Server tenancy > Multi-tenant. From then on all callers are served by runs in your account, and users pay events only. Do this after step 6: without pay-per-event pricing a multi-tenant Actor serves everyone for free at your expense.
8. **Publish**: fill in Publication > Display information (logo, description, categories), then Publish on Store.

## After launch

- **Check that charging works** with a second Apify account, since your own calls are never charged. Look for `charged: true` in the run log and for revenue in Console > Insights > Actor analytics.
- **Read the startup log** of a run. It names any event that the code charges but the pricing does not define.
- **Watch the first week**: platform usage per request against the estimate, upstream errors, 429s from the rate limits.
- **Price changes**: lowering a price is immediate. Raising one, or adding an event, takes effect after 14 days once the Actor has paying users, and can be done once a month. Get the launch prices right.
- **When the API changes**: update `src/config.js`, `pricing.json` and `.actor/openapi.json` together, run `npm test`, then `apify push`.
