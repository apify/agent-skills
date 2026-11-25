# Deploy, monetize and publish

Do this only when the user asks for it and is logged in to the Apify account that will own the Actor. That account holds the upstream API key and receives the payout, so for a partner Actor it should be the partner's account (an organization account if a team manages it), not yours and not the account of whoever is helping them.

Each step changes something real: a deploy, a price, a public listing. Say what you are about to do, and confirm before the steps marked **confirm**.

## 0. Prerequisites

```bash
apify --help   # installed? otherwise: npm install -g apify-cli
apify info     # logged in, and to which account?
```

`apify login` prints a URL and a one-time code for the user to approve in a browser. In a headless environment the CLI reads `APIFY_TOKEN` from the environment. Add `--user-agent apify-agent-skills/apify-api-to-server-actor` to every `apify` command.

## 1. Store the upstream API key

Ask the user to run this themselves, in their own terminal, so the key never passes through the conversation, a file or shell history you can read:

```bash
apify secrets add upstreamApiKey <the-key>
```

`.actor/actor.json` already references it (`"UPSTREAM_API_KEY": "@upstreamApiKey"`). Recommend a key created for this Actor alone, with only the permissions the exposed endpoints need, so it can be rotated or revoked without touching the partner's other integrations. If the user would rather set it in Console (Actor > Source > Environment variables, **Secret** checked), remove `environmentVariables` from `actor.json`, because the file overrides Console.

## 2. Verify against the real API (optional, uses real quota)

```bash
UPSTREAM_API_KEY=<the-key> npm run smoke -- --live
```

One real call per example. Set `live: false` on examples that should not be called for real: they cost a lot, create something, or need an ID from an earlier call (status routes of async jobs). The live run checks for a 2xx answer and prints what each call charged, without asserting the mock's exact counts, because real responses differ. Compare the printed charges with the partner's dashboard. A second live run in the same billing period can differ when the partner does not bill repeat lookups. This is where a wrong path, a wrong auth type or a wrong usage field shows up.

## 3. Deploy (confirm)

```bash
apify push --user-agent apify-agent-skills/apify-api-to-server-actor
```

Creates the Actor (private) from `.actor/actor.json`, uploads the source and builds it. If the build fails on the web server schema, fix `.actor/openapi.json`. Then call it as the owner:

```bash
curl -H "Authorization: Bearer $APIFY_TOKEN" "https://<username>--<actor-name>.apify.actor/"
curl -H "Authorization: Bearer $APIFY_TOKEN" "https://<username>--<actor-name>.apify.actor/<a-cheap-endpoint>"
```

The first request starts a run, so it takes a few seconds. Owner requests are never charged, so this checks the wrapper and the key, not the billing. Read the run's log (Console > Actor > Runs): the startup lines say whether charging is on and which pool the run serves.

Now that the URL is known, replace the `<username>--<actor-name>` placeholder in `README.md` with the URL from the Server tab, and push again.

## 4. Server configuration

Console > Actor > **Settings** > **Server**: memory 256 MB, idle timeout 300 s, desired 20 and max 50 requests per run as a start. See [server-actors.md](server-actors.md) for what each setting does.

## 5. Monetization (confirm)

```bash
npm run pricing -- --console
```

prints the exact values to enter in Console > Actor > **Publication** > **Monetization** > **Set up monetization**: pay per event, one custom event per entry in `pricing.json` (names must match exactly), the primary event, `apify-default-dataset-item` removed, "Pay per event + usage" off. The account needs billing and payout details first.

Then redeploy or wait for a new run, and check the startup log again: it lists any event the code charges that the pricing does not define.

Automating it through the API is possible but not the documented path: `npm run pricing -- --api` prints a `pricingInfos` body for `PUT /v2/actors/{actorId}` that follows the public OpenAPI schema. Read the Actor first, keep its existing pricing records, add one record, and expect the API to reject changes that Console would also reject (several records at once, a change that takes effect in the past, a second pending change). Use Console unless the user asks for automation.

## 6. Switch to multi-tenant (confirm)

Console > Actor > **Settings** > **Server** > **Server tenancy** > **Multi-tenant**.

Order matters: do it after monetization. A multi-tenant Actor without pay-per-event pricing serves every caller for free and bills the owner for the platform usage. After the switch, all callers are served by runs in the owner's account, so check that the account's plan has room for the memory and concurrent runs of three pools (paying users, free users, owner).

### What "multi-tenant" needs from the code, and what it needs from Console

The template is written for multi-tenant from the start: charges carry the request ID, the partner's key and runs stay in the owner's account, callers are told apart by `X-Apify-User-ID`, and async job IDs are bound to their caller. `.actor/actor.json` has no tenancy field, so the switch itself is this Console setting. Until it is flipped, the Actor runs single-tenant (each caller starts their own runs and also pays platform usage) and logs a warning saying so. The public API schema also lists `actorStandby.tenancy` on `PUT /v2/acts/{actorId}`, but Console is the documented way; use the API only if the user asks and confirm the result in Console.

## 7. Publish (confirm)

Console > Actor > **Publication**: display information (logo, a clear description, categories), sample output, then **Publish on Store**. Publishing requires the Store publishing terms to be accepted. The source stays hidden by default. Keep it hidden unless the partner wants the wrapper to be open source.

For the Store page: the title should name the product ("Acme Search API"), the description should say what it does and that it needs no separate account, and the README should open with the quick-start call.

## 8. Verify billing

The owner's requests are not charged, so billing needs a second Apify account:

1. From the second account, call a paid endpoint with that account's token.
2. In the owner's account, open the run that served it. Its log line shows `charged: true` with the event and count, and the run's `externalChargedTotalUsd` shows the amount.
3. Console > **Insights** > **Actor analytics** shows revenue and the deducted platform usage for paying users.

A free-plan second account proves that charging works and that the free-plan policy applies. It produces no payout, by design.

## Changing the free-plan policy later

The partner can change it at any time without code:

1. Edit `FREE_USERS_POLICY` (`allow`, `limit` or `block`) and `FREE_USERS_MAX_REQUESTS_PER_DAY` in `.actor/actor.json`, then `apify push`.
2. Or edit the same variables in Console > Actor > Source > Environment variables and rebuild. Also update `actor.json`, because the next `apify push` writes its values back.

Runs that are already serving keep the old value until the platform replaces them (idle timeout or a new build). The run log's startup line shows the active policy. Update the README's Limits section to match.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Run fails at start: "UPSTREAM_API_KEY is not set" | The secret was not uploaded. Check `apify secrets ls`, the `@name` in `actor.json`, then push again. |
| Every paid call returns 500 `charging-failed` | The event name in `src/config.js` is not defined in the Actor's monetization. The startup log names it. |
| Log says "Charging is OFF" on the platform | The Actor is not pay-per-event yet (step 5). |
| Paid calls work for the owner but return 500 for others | Same as above: owner requests skip charging. Check the event names. |
| 401 or 403 from the upstream API | Wrong `upstream.auth` type or header name, or a key without access to that endpoint. |
| 404 `endpoint-not-found` for a path that exists upstream | It is not in `routes`. Only listed endpoints are reachable. |
| First request slow, then fast | A run had to start. Raise the idle timeout if it happens often. |
| 429 from the platform before reaching the Actor | The platform's per-account rate limit, or no run became available within 2 minutes (raise max requests per run or check account limits). |
| Build fails on `webServerSchema` | `.actor/openapi.json` is not valid OpenAPI 3.x. Run `npm run check`, and validate the file with an OpenAPI linter. |
