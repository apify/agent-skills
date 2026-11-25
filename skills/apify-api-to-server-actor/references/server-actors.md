# Apify Server Actors: the facts this skill relies on

Checked against the Apify documentation and `apify` SDK 3.8.0 in November 2026. Server Actors are new and still moving, so before telling a partner something that matters at launch, re-read the linked page. Append `.md` to any docs URL for a Markdown version.

## What a Server Actor is

- An Actor with the server interface enabled (`"usesStandbyMode": true` in `.actor/actor.json`). It runs an HTTP server and answers requests in real time. "Server Actor" is the current name of what was called Actor Standby mode; API fields and environment variables still say `standby`.
- The platform starts runs when requests arrive, proxies requests to the server inside the run, and stops runs that stay idle longer than the idle timeout.
- It can still be started through the input interface (Console "Start", API, schedules). `APIFY_META_ORIGIN` is `STANDBY` when the server interface started the run.
- Docs: [Develop Server Actors](https://docs.apify.com/actors/development/programming-interface/server-actors), [Server Actors (user view)](https://docs.apify.com/actors/running/server-actors).

## URL and authentication

- Stable URL: `https://<username>--<actor-name>.apify.actor`, plus an ID-based URL that survives renames. Inside a run it is in `ACTOR_STANDBY_URL`. Copy it from the Actor's **Server** tab instead of constructing it.
- Callers authenticate with their Apify API token: `Authorization: Bearer <token>` (recommended) or `?token=<token>`. The platform removes the token before forwarding the request, so the Actor never sees it.
- If a client must use the `Authorization` header for something else, it can send the Apify token in `X-Apify-Authorization` instead.
- Scoped tokens work. Requests without a valid token do not reach the Actor.
- Consequence for wrappers of Bearer-auth APIs: a client written for the partner's API can often be pointed at the Actor by changing only the base URL and using an Apify token as the API key.

## What the Actor receives with each request

| Header | Meaning |
| --- | --- |
| `X-Apify-User-ID` | Apify user ID of the caller. The only identity the Actor gets: no name, email or token. |
| `X-Actor-Request-ID` | Unique ID of this request. A charge must carry it so the caller is billed. It stops working when the response ends. |
| `x-apify-container-server-readiness-probe` | Present on the platform's readiness check, a `GET /` sent once before a run receives traffic. Always answer 200. |

The server must listen on `ACTOR_WEB_SERVER_PORT` (4321 in local runs).

## Tenancy

| | Multi-tenant | Single-tenant (the default for a new Actor) |
| --- | --- | --- |
| Runs live in | The owner's account, shared by all callers | Each caller's own account |
| Caller pays | Events only | Events plus the platform usage of their runs |
| Run's `APIFY_TOKEN`, storages | The owner's | The caller's |
| Cold starts | Rare, runs are shared and warm | One per caller after idle timeout |
| Secrets in the Actor | Stay in the owner's runs | Run inside the caller's account (still not readable by them) |

- A thin API wrapper wants multi-tenant: "one request, one answer", many users, idle between calls. Requirements: server interface enabled, and pay-per-event pricing to earn anything (with pay-per-usage pricing the owner pays for everyone).
- Switch it in Console: Actor > **Settings** > **Server** > **Server tenancy**. It applies to all callers within about 2 minutes, in both directions.
- The platform keeps three pools of runs in the owner's account, visible as `standby.deployment` on the run object: `MULTI_TENANT_PAYING_USERS`, `MULTI_TENANT_FREE_USERS`, `MULTI_TENANT_OWNER_PAID`. All count against the owner's memory and concurrent-run limits. The template reads the pool at startup to apply the free-plan policy.
- Tasks of a multi-tenant Server Actor do not serve server requests.
- Docs: [Choose the tenancy](https://docs.apify.com/actors/development/programming-interface/server-actors#choose-the-tenancy), [Migrate an Actor to multi-tenant](https://docs.apify.com/actors/development/programming-interface/server-actors/migrate-to-multi-tenant).

## Who pays for what (multi-tenant, pay per event)

| Request from | Event charges | Platform usage |
| --- | --- | --- |
| User on a paid plan | User pays. Owner earns them minus Apify's 20% share. | Deducted from the owner's payout |
| User on the free plan | User pays from free credit. Owner earns nothing. | Covered by Apify |
| The owner | Not charged | Charged to the owner |

Docs: [Monetize multi-tenant Server Actors](https://docs.apify.com/actors/monetize/server-actors).

## Charging a request

- Endpoint: `POST /v2/actor-runs/{runId}/charge` with `{ eventName, count, requestId }` and an `idempotency-key` header, authenticated with the run's `APIFY_TOKEN`. The key is remembered for 3 minutes.
- The JavaScript SDK does this since `apify` 3.8.0: `Actor.charge({ eventName, count, requestId, idempotencyKey })`. In a multi-tenant run it requires `requestId`. In a single-tenant or input-interface run it ignores `requestId` and tracks the user's spending limit instead. The template calls it in every kind of run. (The docs page may still say the SDKs do not support request IDs. The SDK changelog is the authority.)
- Charge before the final response is sent. Charge custom events only: the synthetic `apify-actor-start` and `apify-default-dataset-item` events belong to the run, which is the owner's.
- A missing, expired or foreign request ID returns HTTP 400 and charges nothing. An event that is not in the Actor's pricing is not charged either (the SDK logs a warning and reports 0 charged).
- If the Actor is not pay-per-event, `Actor.charge()` is a no-op. The template detects this at startup and logs that charging is off.
- Not documented: what the platform does when a multi-tenant caller's account cannot cover a charge. Test it with a second account before relying on large charges per request.
- Docs: [Charge for a request](https://docs.apify.com/actors/monetize/server-actors#charge-for-a-request), [Charge events in Actor run](https://docs.apify.com/api/v2/post-charge-run).

## Limits

- A request must receive its first response byte within 5 minutes. If no run can take the request within 2 minutes, it fails with 429.
- Requests are rate-limited per calling account by the platform (`X-RateLimit-Limit` response header), in addition to the Actor's own limits.
- An account over its monthly usage hard limit has new requests rejected.
- No health checks after the readiness probe: a server that hangs keeps receiving traffic. Exit the process on an unrecoverable error.
- Do not keep state only in memory. Runs are stopped when idle and replaced on migration.

## Server configuration (Console > Actor > Settings > Server)

| Setting | Meaning | Starting point for a thin wrapper |
| --- | --- | --- |
| Memory | RAM per run. Billed while the run is alive. | 256 MB |
| Desired requests per run | Concurrency at which the platform starts another run ahead of need | 20 |
| Max requests per run | Hard concurrency cap per run | 50 |
| Idle timeout | How long an idle run stays up. Longer means fewer cold starts and more idle cost. | 300 s |
| Build | Build tag or number that serves requests | `latest` |

These are starting points, not platform recommendations. Tune them from the run metrics after launch. The same fields are `actorStandby` in the [Update Actor](https://docs.apify.com/api/v2/act-put) API. To test another build without switching, the owner can send the `X-Actor-Build` header.

## Endpoint schema

- `"webServerSchema"` in `actor.json` (inline, or a path relative to `.actor/`) attaches an OpenAPI 3.x document. The build validates it. Console and Store render it as Swagger UI on the **Server** tab, and tools such as the Apify MCP server read it to call the Actor.
- The platform does not validate requests against it, and replaces `servers` with the Actor's URL.
- Docs: [Actor web server schema](https://docs.apify.com/actors/development/actor-definition/web-server-schema).

## Publishing and Store

- Store's automated daily test skips Server Actors, so the input interface does not have to pass it.
- Publishing requires a README, input and output schemas, at least one build and run, and accepted Store publishing terms. Monetization requires billing and payout details.
- Limited permissions (the default) are enough: the Actor only uses its own storages.
- The quality score rewards a clear README, an endpoint schema, transparent PPE pricing and limited permissions.
- Docs: [Publish your Actor](https://docs.apify.com/actors/publishing/publish), [Actor quality score](https://docs.apify.com/actors/publishing/quality-score).

## Secrets

- `apify secrets add <name> <value>` stores a secret locally. `"environmentVariables": { "UPSTREAM_API_KEY": "@<name>" }` in `actor.json` uploads it as a secret environment variable on `apify push`. Secrets are encrypted, redacted from logs and never shown on the Actor's public page.
- Variables in `actor.json` override the ones set in Console. To manage the key in Console instead (Actor > Source > Environment variables, with **Secret** checked), remove `environmentVariables` from `actor.json`.
- Docs: [Environment variables](https://docs.apify.com/actors/development/programming-interface/environment-variables).
