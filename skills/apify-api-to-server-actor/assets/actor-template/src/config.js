/**
 * The whole wrapper is defined in this file. Everything else in src/ is generic plumbing
 * that you should not need to touch.
 *
 * Three things live here:
 *   upstream  where the wrapped API is and how the Actor authenticates to it
 *   routes    which endpoints the Actor exposes, and which pricing events each one charges
 *   limits    guard rails that protect the upstream API key from abuse
 *
 * The upstream API key is NOT in this file. It comes from the UPSTREAM_API_KEY
 * environment variable, stored as a secret (see .actor/actor.json and LAUNCH.md).
 *
 * Event names used below must exist in pricing.json and in the Actor's monetization
 * settings in Apify Console. `npm run check` verifies the first, the Actor's startup
 * log verifies the second.
 */
// Throw an HttpError from any hook to answer the caller with that status and nothing is charged:
//   throw new HttpError(400, 'limit-too-high', 'limit must be 1000 or less.');
// eslint-disable-next-line no-unused-vars
import { HttpError } from './errors.js';

export default {
    upstream: {
        // Base URL of the wrapped API, without a trailing slash.
        baseUrl: 'https://api.example.com',

        // How the upstream API expects its key:
        //   { type: 'bearer' }                                Authorization: Bearer <key>
        //   { type: 'header', name: 'X-API-Key' }             X-API-Key: <key>      (optional `prefix`)
        //   { type: 'query', name: 'api_key' }                ?api_key=<key>
        //   { type: 'basic' }                                 Authorization: Basic base64(<key>), key = "user:password"
        //   { type: 'custom', apply: (req, key) => { ... } }  anything else, e.g. request signing
        //   { type: 'none' }                                  public API, no key
        auth: { type: 'bearer' },

        // Environment variable that holds the upstream API key.
        apiKeyEnvVar: 'UPSTREAM_API_KEY',

        // Upstream calls that take longer are aborted and answered with 504. A route can override it
        // with its own `timeoutSecs`. Stay well under the platform's 5-minute limit for the first byte.
        timeoutSecs: 120,

        // Static headers added to every upstream call.
        headers: {},

        // Upstream statuses that mean the OWNER's key or account has a problem (bad key, out of credit,
        // plan limit). Callers get a neutral 503 and are not charged, the owner gets an error in the log.
        // Add the API's own codes, e.g. [401, 402, 432, 433]. Default: [401, 402].
        ownerErrorStatuses: [401, 402],

        // Caller query parameters that are never forwarded. Common credential names (token, api_key,
        // apikey, api-key, access_token, auth_token) and the auth parameter are always dropped.
        dropQuery: [],
    },

    /**
     * One entry per exposed endpoint. Only these are reachable, anything else gets a 404,
     * so the Actor can never be used as an open proxy to the rest of the upstream API.
     *
     * Required:
     *   method        HTTP method the Actor accepts
     *   path          Path the Actor exposes. Use {name} for path parameters.
     *   event         Pricing event charged for a billable call, null for a free endpoint, or an array
     *                 of events when one call has several prices (then `count` returns an object)
     *
     * Optional:
     *   summary          One line shown in the endpoint index and in the OpenAPI schema
     *   upstreamPath     Path on the upstream API (default: same as `path`). May use the same {name} params.
     *   upstreamMethod   Method on the upstream API (default: same as `method`)
     *   upstreamQuery    Query parameters always sent upstream. They override what the caller sent.
     *   allowQuery       If set, only these caller query parameters are forwarded
     *   forwardHeaders   Extra caller headers to forward (content-type, accept and accept-language always are)
     *   count            How many events one call charges:
     *                      a number (default 1)
     *                      (ctx) => number                      usage-based price, one event
     *                      (ctx) => ({ 'event-a': n, ... })     several events (route `event` is an array)
     *                    Counts are rounded up to whole events. 0 charges nothing.
     *   chargeOn         'success' (default, upstream answered 2xx), 'always', or (ctx) => boolean.
     *                    Mirror what the upstream API itself bills for. Check its 2xx codes: a 202
     *                    "accepted, still running" or a vendor code such as 222 may not be billable.
     *   priceNote        One sentence on what a call costs, for the OpenAPI schema (default: generated)
     *   timeoutSecs      Upstream timeout for this route
     *   stream           true to pipe the upstream body through as it arrives (SSE, large downloads).
     *                    transformResponse does not run on a streamed 2xx response.
     *   ownedParams      Path params that carry IDs of resources created by one caller (async jobs).
     *                    The Actor then accepts only IDs it issued to that same caller, see src/ownership.js.
     *   transformRequest  (upstreamRequest, ctx) => void. Mutate { url, method, headers, body } before it is sent.
     *   transformResponse (ctx) => void. Mutate ctx.upstream.body before it is returned. Runs BEFORE
     *                     count and chargeOn, so they see the transformed body. It cannot change the status:
     *                     throw an HttpError instead.
     *   undo             async (ctx) => void. Runs when the upstream call succeeded but could not be charged
     *                    (or transformResponse failed), so the caller gets an error. Cancel what the call started.
     *                    Use originalJson(): after transformResponse, json() holds the signed ID, not the upstream one.
     *                    undo: (ctx) => ctx.callUpstream('DELETE', `/v1/jobs/${ctx.upstream.originalJson().id}`)
     *   requiresCaller   true to refuse the call (401) when the caller's Apify user ID is missing. Implied by
     *                    ownedParams and undo. Set it on any route whose hooks call ctx.signId.
     *   openapi          Object merged into this route's operation by `npm run openapi`, so hand-written
     *                    docs (description, parameters, examples) survive regenerating the schema.
     *   examples         Sample calls, used by `npm run smoke` and by the docs. Add one per price branch,
     *                    one per validation rule, and one per non-200 answer that is priced differently:
     *                    [{ name, params, query, body, mockStatus, mockResponse, mockHeaders, expect, live }]
     *                    mockStatus: what the mock upstream answers (default 200), e.g. 202 or a vendor code.
     *                    expect: { event, count } for one event, { charges: { 'event-a': 1 } } for several,
     *                    { count: 0 } for "charges nothing". Optional in expect: status (the Actor's answer),
     *                    upstreamCalls: 0 (the Actor rejects the call itself), upstreamBody: { field: value }
     *                    and upstreamBodyLacks: ['field'] (what transformRequest must send or drop).
     *                    Use real, cheap inputs: `smoke -- --live` sends them to the real API.
     *                    live: false skips an example there (it needs an ID from an earlier call, or real data).
     *                    (`example: {...}` is accepted as a single example.)
     *
     * ctx (passed to count, chargeOn and the transform hooks):
     *   ctx.userId                Apify user ID of the caller (X-Apify-User-ID)
     *   ctx.pool                  Run pool: MULTI_TENANT_PAYING_USERS, MULTI_TENANT_FREE_USERS, ...
     *   ctx.request               { method, path, params, query, headers, body (Buffer), json() }
     *                             The caller's request, with credential fields (api_key, ...) already removed.
     *                             json() returns a fresh copy each time. To change what goes upstream, edit it and
     *                             assign it in transformRequest: request.body = JSON.stringify(edited)
     *   ctx.upstream              { status, ok, headers, body (Buffer, settable), json(), text(), streamTail,
     *                               originalJson() (the body before transformResponse) }
     *   ctx.signId(id)            Turn an upstream resource ID into one bound to this caller
     *   ctx.callUpstream(method, path, { query, body })   Extra call to the upstream API with the owner's key
     *   ctx.log                   Logger: ctx.log.info(message, data), .warning(), .error()
     *   ctx.actorUrl              The Actor's public URL, for rewriting absolute links (next pages, status URLs)
     */
    routes: [
        {
            method: 'GET',
            path: '/v1/items/{id}',
            summary: 'Get one item by ID.',
            event: 'item-lookup',
            // Hand-written docs for the schema. `npm run openapi` copies them from the upstream
            // OpenAPI file when there is one, and merges this field on top.
            openapi: { responses: { 200: { description: 'The item.' } } },
            examples: [{
                params: { id: '42' },
                mockResponse: { id: '42', name: 'Example item' },
                expect: { event: 'item-lookup', count: 1 },
            }],
        },
        {
            method: 'POST',
            path: '/v1/search',
            summary: 'Search items. Charged per returned result.',
            event: 'search-result',
            openapi: {
                requestBody: {
                    description: 'What to search for.',
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['query'],
                                properties: { query: { type: 'string' }, limit: { type: 'integer', default: 10 } },
                            },
                        },
                    },
                },
                responses: { 200: { description: 'Search results.' } },
            },
            // Usage-based pricing: one event per result the upstream API returned.
            count: (ctx) => ctx.upstream.json()?.results?.length ?? 0,
            examples: [
                {
                    name: 'three results',
                    body: { query: 'example', limit: 3 },
                    mockResponse: { results: [{ id: '1' }, { id: '2' }, { id: '3' }] },
                    expect: { event: 'search-result', count: 3 },
                },
                {
                    name: 'no results is free',
                    body: { query: 'nothing matches this' },
                    mockResponse: { results: [] },
                    expect: { count: 0 },
                },
            ],
        },
        {
            method: 'GET',
            path: '/v1/status',
            summary: 'Upstream service status. Free.',
            event: null,
            openapi: { responses: { 200: { description: 'Service status.' } } },
            examples: [{ mockResponse: { status: 'ok' } }],
        },
    ],

    limits: {
        // Per caller, per run of the Actor. They keep one caller from draining
        // the rate limit that the upstream API applies to your single API key.
        perUserRequestsPerMinute: 120,
        perUserConcurrency: 10,
        maxRequestBodyBytes: 10 * 1024 * 1024,

        // All callers together, per run (0 = off). The platform runs several runs side by side, so the
        // upstream key can see up to (number of runs) x this. Use it to stay under a key-wide rate limit.
        totalRequestsPerMinute: 0,

        // Callers on the Apify free plan pay for events from their free platform credit,
        // but none of that reaches your payout, while their calls still cost you upstream.
        // This is the partner's decision. The value here is only the default: the environment variables
        // FREE_USERS_POLICY and FREE_USERS_MAX_REQUESTS_PER_DAY override it without a code change
        // (set in .actor/actor.json, or in Apify Console > Source > Environment variables).
        //   policy: 'allow'  serve them like anyone else (treat it as a free trial)
        //           'limit'  serve up to maxRequestsPerDay paid calls per caller (free routes such as status
        //                    polls do not count; best effort, counted per run)
        //           'block'  answer 403 and ask them to upgrade their Apify plan
        freeUsers: { policy: 'limit', maxRequestsPerDay: 100 },
    },

    // What to do when a billable call cannot be charged (event missing in the Actor's
    // pricing, platform error, caller out of budget):
    //   'fail'   answer with an error and do not return the upstream result (default)
    //   'serve'  return the result anyway and only log the problem
    onChargeFailure: 'fail',

    // After a caller's charge is refused, their paid calls are refused (402) for this long, so retries do not
    // spend your upstream credits on calls nobody pays for. Counted per run. 0 turns it off.
    chargeFailureCooldownSecs: 300,
};
