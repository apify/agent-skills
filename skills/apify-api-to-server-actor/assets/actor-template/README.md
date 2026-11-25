# TODO Product API

TODO One or two sentences: what the API does, for whom, and why to use it through Apify. Example: "Search and fetch X in real time. No separate TODO Product account or API key needed: call it with your Apify token and pay per call."

TODO Keep the next sentence only if TODO Company owns and publishes this Actor. Otherwise say who runs it.
This Actor is the official TODO Product API, run by TODO Company on Apify. It is a [Server Actor](https://docs.apify.com/actors/running/server-actors): you send it an HTTP request and get the answer straight back, with no run to start or wait for.

## Quick start

```bash
curl -H "Authorization: Bearer $APIFY_TOKEN" \
  "https://<username>--<actor-name>.apify.actor/v1/items/42"
```

- **Base URL**: `https://<username>--<actor-name>.apify.actor` (also shown on the **Server** tab). The URL is known after the first deploy; `npm run check` reminds you to fill it in.
- **Authentication**: your [Apify API token](https://console.apify.com/settings/integrations) in the `Authorization: Bearer` header. You do not need a TODO Product key.
- **Endpoint list**: `GET /` returns all endpoints as JSON. The **Server** tab has the full reference, with parameters and a try-it-out console.

## Endpoints

TODO One row per route in `src/config.js`.

| Endpoint | What it does | Charged event |
| --- | --- | --- |
| `GET /v1/items/{id}` | Get one item by ID. | Item lookup |
| `POST /v1/search` | Search items. | Search result, one per returned result |
| `GET /v1/status` | Service status. | Free |

Requests and responses are the same as in the [TODO Product API reference](https://example.com/docs). Request bodies, query parameters and response bodies pass through unchanged.

### Example

TODO One realistic request and its response.

```bash
curl -X POST "https://<username>--<actor-name>.apify.actor/v1/search" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "example", "limit": 3}'
```

## Pricing

You pay per event, with your Apify account. There is no subscription and no minimum. Prices match TODO Product's own pay-as-you-go prices.

TODO Paste the output of `npm run pricing -- --readme`.

| Event | What you pay for | Price | Per 1,000 |
| --- | --- | --- | --- |
| Item lookup | One item returned by GET /v1/items/{id}. | $0.004 | $4.00 |
| Search result | One result returned by POST /v1/search. A search with no results is free. | $0.002 | $2.00 |

- You are charged only for successful calls. If TODO Product returns an error, you pay nothing.
- Every response carries `x-charged-event` and `x-charged-count` headers, so you can see what a call cost.
- Platform usage (compute, storage) is included. Calls to the server URL cost the events above and nothing else. A run started from the input form (one call per run) also pays Apify's small Actor start fee, so use the server URL for anything frequent.

## Limits

- TODO requests per minute and TODO concurrent requests per Apify account. Above that, the API answers `429` with a `Retry-After` header.
- TODO Free-plan policy, matching `FREE_USERS_POLICY` in `.actor/actor.json`. For `limit`: "Accounts on the Apify free plan can make about 100 paid calls per day." For `block`: "This API needs a paid Apify plan." For `allow`, leave the line out. (A limit is counted per server run, so describe it as approximate.)
- A request must be answered within TODO seconds, otherwise it fails with `504` and is not charged.

## Errors

Errors from TODO Product are passed through with their original status code and body. Errors raised by the Actor itself look like this:

```json
{ "error": { "type": "rate-limit-exceeded", "message": "Limit of 120 requests per minute reached. Retry in 3 s." } }
```

| Status | Type | Meaning |
| --- | --- | --- |
| 404 | `endpoint-not-found` | The path is not one of the endpoints above. |
| 429 | `rate-limit-exceeded`, `too-many-concurrent-requests` | Slow down and retry after the time in `Retry-After`. |
| 500 | `charging-failed` | The call could not be billed, so no result was returned. On an endpoint that charges several events, the first may already have been charged. |
| 502 / 504 | `upstream-unreachable`, `upstream-timeout` | TODO Product did not answer. You were not charged. |

## Use it from the input form, schedules and integrations

The same endpoints are available as a regular Actor run, one call per run: set **Endpoint path**, **HTTP method** and, if needed, **Query parameters** or **Request body**. The response is stored in the run's dataset. For anything interactive or high-volume, call the server URL instead: it answers in milliseconds and has no start-up cost.

## Use it from AI agents

The [Apify MCP server](https://mcp.apify.com) lets AI agents discover this Actor and call its endpoints from the endpoint schema, so the API works as a tool in Claude, ChatGPT, Cursor and other MCP clients.

## Data and privacy

Your requests are forwarded to TODO Product's API and the responses are returned to you. The Actor does not store request or response bodies. It receives your Apify user ID (to apply the limits above), never your name, email or API token. TODO Link to the product's privacy policy.

## Support

TODO Where to get help: the **Issues** tab of this Actor, a support email, the product's docs.
