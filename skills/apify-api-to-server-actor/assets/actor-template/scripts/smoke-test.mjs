#!/usr/bin/env node
/**
 * End-to-end smoke test that needs no accounts, no keys and no dependencies:
 *
 *     npm run smoke              against a built-in mock of the upstream API
 *     npm run smoke -- --live    against the real upstream API (uses UPSTREAM_API_KEY and real quota)
 *
 * It starts the Actor's HTTP server in this process, points it at a mock upstream API, and for
 * every route in src/config.js checks the things that matter for a paid wrapper:
 *
 *   - the call reaches the right upstream endpoint, with the owner's key attached
 *   - nothing of the caller's Apify credentials, or a key the caller supplies, goes upstream
 *   - a successful call charges exactly the expected events and counts, for every example
 *   - a failed upstream call charges nothing
 *   - an upstream error about the owner's key or account reaches the caller only as a neutral 503
 *   - a call that cannot be charged does not return the result
 *   - paths that are not routes never reach the upstream API
 *
 * Each route is exercised with its `examples` from src/config.js:
 *   [{ name, params, query, body, mockStatus, mockResponse, mockHeaders, expect, live }]
 *   expect: { event, count } | { charges: {...} } | { count: 0 }, plus optional status, upstreamCalls (0 = the Actor
 *           rejects the call itself), upstreamBody (fields the upstream must receive), upstreamBodyLacks (field names)
 *
 * With --live, the examples run against the real API. Exact counts are not asserted there, because
 * real responses differ from the mock ones: the test checks for a 2xx answer and prints what was charged.
 */
import http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = async (file) => import(pathToFileURL(join(root, file)).href);

const config = (await load('src/config.js')).default;
const { createPipeline, routeEvents } = await load('src/pipeline.js');
const { createServer } = await load('src/server.js');
const { createLimits } = await load('src/limits.js');
const { createSigner } = await load('src/ownership.js');

const live = process.argv.includes('--live');
const verbose = process.argv.includes('--verbose');

const MOCK_KEY = 'mock-upstream-key-0123456789';
const CALLER_TOKEN = 'caller-apify-token-must-not-leak';
const CALLER_KEY = 'caller-supplied-key-must-not-leak';
const USER = 'smoke-test-user';

let passed = 0;
let failed = 0;
const check = (ok, label, detail = '') => {
    if (ok) passed += 1;
    else failed += 1;
    if (!ok || verbose) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && detail ? `\n         ${detail}` : ''}`);
};
const note = (text) => console.log(`  note  ${text}`);

const listen = (server) => new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
});
const quietLogger = { info: () => {}, warning: () => {}, error: (...args) => verbose && console.log('    [actor log]', ...args) };

// ------------------------------------------------------------------ mock upstream API
const upstreamCalls = [];
let nextUpstreamResponse = null;
const mockUpstream = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    upstreamCalls.push({ method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString('utf8') });
    const { status = 200, json = { ok: true }, headers = {} } = nextUpstreamResponse ?? {};
    const body = JSON.stringify(json);
    res.writeHead(status, { 'content-type': 'application/json', 'set-cookie': 'upstream-session=1', 'x-upstream-internal': 'hidden', ...headers });
    res.end(body);
});

// ------------------------------------------------------------------ Actor under test
const charges = [];
let failCharges = false;
const charging = {
    enabled: true,
    remaining: () => Infinity,
    charge: async (options) => {
        if (failCharges) throw new Error('simulated charging failure');
        charges.push(options);
        return { chargedCount: options.count, eventChargeLimitReached: false };
    },
};

const upstreamBase = live ? config.upstream.baseUrl : await listen(mockUpstream);
const apiKey = live ? process.env[config.upstream.apiKeyEnvVar ?? 'UPSTREAM_API_KEY'] : MOCK_KEY;
if (live && (config.upstream.auth?.type ?? 'none') !== 'none' && !apiKey) {
    console.error(`--live needs the ${config.upstream.apiKeyEnvVar ?? 'UPSTREAM_API_KEY'} environment variable.`);
    process.exit(1);
}

const signer = createSigner({ secret: apiKey ?? 'smoke-test' });
// The cooldown after a refused charge is tested on its own below, so it is off for the per-route checks.
const testConfig = { ...config, chargeFailureCooldownSecs: 0, upstream: { ...config.upstream, baseUrl: upstreamBase } };
const pipeline = createPipeline({
    config: testConfig,
    apiKey,
    charging,
    // The test sends bursts, so rate limits are off here and tested separately below.
    limits: createLimits({ limits: {} }),
    signer,
    logger: quietLogger,
});
const actor = createServer({ pipeline, config: testConfig, logger: quietLogger, about: { name: 'smoke-test' } });
const actorBase = await listen(actor);

const PARAM = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const fill = (template, params) => template.replace(PARAM, (_, name) => encodeURIComponent(params[name] ?? `sample-${name}`));
const examplesOf = (route) => route.examples ?? (route.example ? [route.example] : [{}]);
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const ownerErrorStatuses = config.upstream.ownerErrorStatuses ?? [401, 402];

async function call(route, example, { signOwned = true, contentType = 'application/json' } = {}) {
    const upstreamParams = {};
    for (const [, name] of route.path.matchAll(PARAM)) upstreamParams[name] = String(example.params?.[name] ?? `sample-${name}`);
    const callerParams = { ...upstreamParams };
    if (signOwned) for (const name of route.ownedParams ?? []) callerParams[name] = signer.sign(USER, upstreamParams[name]);

    const url = new URL(actorBase + fill(route.path, callerParams));
    for (const [key, value] of Object.entries(example.query ?? {})) url.searchParams.set(key, String(value));
    url.searchParams.set('token', CALLER_TOKEN);
    url.searchParams.set('api_key', CALLER_KEY);

    const hasBody = !['GET', 'HEAD'].includes(route.method);
    const response = await fetch(url, {
        method: route.method,
        headers: {
            authorization: `Bearer ${CALLER_TOKEN}`,
            cookie: `session=${CALLER_TOKEN}`,
            'x-apify-user-id': USER,
            'x-actor-request-id': `req-${Math.random().toString(36).slice(2)}`,
            ...(hasBody ? { 'content-type': contentType } : {}),
        },
        // A key planted in the body must not reach the upstream API either.
        body: hasBody ? JSON.stringify(isPlainObject(example.body ?? {}) ? { ...(example.body ?? {}), api_key: CALLER_KEY } : example.body) : undefined,
        redirect: 'manual',
    });
    return { response, text: await response.text(), upstreamParams };
}

const reset = () => {
    upstreamCalls.length = 0;
    charges.length = 0;
};
/** { event: total count } of what was charged since the last reset. */
const chargedMap = () => charges.reduce((map, c) => ({ ...map, [c.eventName]: (map[c.eventName] ?? 0) + c.count }), {});
const describe = (map) => (Object.keys(map).length ? Object.entries(map).map(([e, n]) => `${e} x${n}`).join(', ') : 'nothing');
const sameMap = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/** What an example should charge, or null if it cannot be known without running the route's functions. */
function expectedCharges(route, example) {
    const events = routeEvents(route);
    if (events.length === 0) return {};
    const want = example.expect;
    if (want) {
        if (want.charges) return Object.fromEntries(Object.entries(want.charges).filter(([, n]) => n > 0));
        if (want.count === 0) return {};
        return { [want.event ?? events[0]]: want.count };
    }
    if (!Array.isArray(route.event) && typeof route.count !== 'function' && typeof route.chargeOn !== 'function') {
        const n = route.count ?? 1;
        return n > 0 ? { [route.event]: n } : {};
    }
    return null;
}

// ------------------------------------------------------------------ platform contract
console.log(`\nSmoke test against ${live ? `the LIVE upstream API at ${upstreamBase}` : 'the mock upstream API'}\n`);
console.log('Server');
{
    const probe = await fetch(`${actorBase}/`, { headers: { 'x-apify-container-server-readiness-probe': '1' } });
    check(probe.status === 200, 'answers the readiness probe with 200', `got ${probe.status}`);

    reset();
    const unknown = await fetch(`${actorBase}/__not-a-route__/x`, { headers: { 'x-apify-user-id': USER } });
    check(unknown.status === 404, 'unknown path returns 404', `got ${unknown.status}`);
    check(upstreamCalls.length === 0, 'unknown path never reaches the upstream API');
    check(charges.length === 0, 'unknown path charges nothing');

    if (!pipeline.routes.some((r) => r.path === '/' && r.method === 'GET')) {
        const index = await fetch(`${actorBase}/`);
        const listed = (await index.json().catch(() => ({}))).endpoints?.length;
        check(index.status === 200 && listed === pipeline.routes.length, 'GET / lists every endpoint', `status ${index.status}, ${listed} of ${pipeline.routes.length} listed`);
    }
}

// ------------------------------------------------------------------ every route
for (const route of pipeline.routes) {
    const examples = examplesOf(route);
    const events = routeEvents(route);
    console.log(`\n${route.method} ${route.path}${events.length ? `  ->  ${events.join(', ')}` : '  (free)'}`);
    if (!live && route.transformRequest) note('transformRequest is set, so the request body is not checked for pass-through. Cover it with examples.');
    if (!live && route.transformResponse) note('transformResponse is set, so the response body is not checked for pass-through. Cover it with examples.');

    // 1. Successful call, once per example
    for (const example of examples) {
        const label = examples.length > 1 || example.name ? ` [${example.name ?? `example ${examples.indexOf(example) + 1}`}]` : '';
        if (live && example.live === false) {
            console.log(`  skipped${label} (live: false)`);
            continue;
        }
        reset();
        nextUpstreamResponse = { status: example.mockStatus ?? 200, json: example.mockResponse ?? { ok: true }, headers: example.mockHeaders };
        const good = await call(route, example);
        const got = chargedMap();

        if (live) {
            check(good.response.status >= 200 && good.response.status < 300, `live call returns 2xx${label}`, `got ${good.response.status}: ${good.text.slice(0, 200)}`);
            check(Object.keys(got).every((e) => events.includes(e)), `charges only the route's events${label}`, `charged ${describe(got)}`);
            console.log(`  live${label}: status ${good.response.status}, charged ${describe(got)}${example.expect ? `, mock example expects ${describe(expectedCharges(route, example) ?? {})}` : ''}`);
            continue;
        }

        const wantStatus = example.expect?.status ?? (ownerErrorStatuses.includes(example.mockStatus) ? 503 : (example.mockStatus ?? 200));
        if (example.expect?.upstreamCalls === 0) {
            // The Actor itself rejects this call (validation, a disallowed option): nothing goes upstream, nothing is charged.
            check(good.response.status === wantStatus, `rejects the call with ${wantStatus}${label}`, `got ${good.response.status}: ${good.text.slice(0, 200)}`);
            check(upstreamCalls.length === 0, `a rejected call never reaches the upstream API${label}`, `made ${upstreamCalls.length}`);
            check(charges.length === 0, `a rejected call charges nothing${label}`, `charged ${describe(got)}`);
            continue;
        }
        check(good.response.status === wantStatus, `call returns ${wantStatus}${label}`, `got ${good.response.status}: ${good.text.slice(0, 200)}`);
        const seen = upstreamCalls[0];
        check(upstreamCalls.length === 1, `makes exactly one upstream call${label}`, `made ${upstreamCalls.length}`);
        if (seen) {
            const expectedPath = fill(route.upstreamPath ?? route.path, good.upstreamParams);
            const seenUrl = new URL(seen.url, 'http://upstream');
            check(seenUrl.pathname === expectedPath, `calls upstream path ${expectedPath}${label}`, `called ${seenUrl.pathname}`);
            check(seen.method === (route.upstreamMethod ?? route.method).toUpperCase(), `uses upstream method ${(route.upstreamMethod ?? route.method).toUpperCase()}${label}`, `used ${seen.method}`);

            const auth = config.upstream.auth ?? { type: 'none' };
            const everything = `${seen.url}\n${JSON.stringify(seen.headers)}\n${seen.body}`;
            if (auth.type === 'bearer') check(seen.headers.authorization === `Bearer ${MOCK_KEY}`, 'sends the upstream key as a Bearer token');
            if (auth.type === 'header') check(seen.headers[auth.name.toLowerCase()] === `${auth.prefix ?? ''}${MOCK_KEY}`, `sends the upstream key in the ${auth.name} header`);
            if (auth.type === 'query') check(seenUrl.searchParams.get(auth.name) === MOCK_KEY, `sends the upstream key as ?${auth.name}=`);
            if (auth.type === 'basic') check(seen.headers.authorization === `Basic ${Buffer.from(MOCK_KEY).toString('base64')}`, 'sends the upstream key as Basic auth');
            check(!everything.includes(CALLER_TOKEN), 'does not leak the caller\'s Apify token or cookies upstream');
            check(!everything.includes(CALLER_KEY), 'does not forward a key the caller supplies (api_key in the query or body)');
            check(!Object.keys(seen.headers).some((h) => /^x-(apify|actor)-/.test(h)), 'does not forward platform headers upstream');

            for (const [key, value] of Object.entries(example.query ?? {})) {
                if (route.allowQuery && !route.allowQuery.includes(key)) {
                    check(!seenUrl.searchParams.has(key), `drops query parameter ${key}, which is not in allowQuery`);
                    continue;
                }
                if (route.upstreamQuery && key in route.upstreamQuery) continue;
                check(seenUrl.searchParams.get(key) === String(value), `forwards query parameter ${key}`, `upstream got ${seenUrl.searchParams.get(key)}`);
            }
            if (!['GET', 'HEAD'].includes(route.method) && example.body && !route.transformRequest) {
                check(seen.body === JSON.stringify(example.body), `forwards the request body unchanged${label}`);
            }
            // What a transformRequest hook must have sent: expect.upstreamBody (fields and values), expect.upstreamBodyLacks (field names)
            if (example.expect?.upstreamBody || example.expect?.upstreamBodyLacks) {
                let sent;
                try {
                    sent = JSON.parse(seen.body);
                } catch {
                    sent = undefined;
                }
                for (const [key, value] of Object.entries(example.expect.upstreamBody ?? {})) {
                    check(JSON.stringify(sent?.[key]) === JSON.stringify(value), `sends ${key}=${JSON.stringify(value)} upstream${label}`, `upstream got ${JSON.stringify(sent?.[key])}`);
                }
                for (const key of example.expect.upstreamBodyLacks ?? []) {
                    check(Boolean(sent) && !(key in sent), `does not send ${key} upstream${label}`, `upstream body: ${seen.body.slice(0, 200)}`);
                }
            }
        }
        check(!good.response.headers.has('set-cookie') && !good.response.headers.has('x-upstream-internal'), 'does not pass upstream cookies or internal headers to the caller');
        if (!route.transformResponse && good.response.status === (example.mockStatus ?? 200)) {
            check(good.text === JSON.stringify(example.mockResponse ?? { ok: true }), `returns the upstream response unchanged${label}`);
        }

        // What was charged
        const want = expectedCharges(route, example);
        if (events.length === 0) {
            check(charges.length === 0, 'free endpoint charges nothing', `charged ${describe(got)}`);
        } else if (want) {
            check(sameMap(got, want), `charges ${describe(want)}${label}`, `charged ${describe(got)}`);
        } else {
            note(`charged ${describe(got)}${label}. Add expect to the example to assert it.`);
        }
        if (charges.length) {
            check(charges.every((c) => Boolean(c.requestId)), 'passes the request ID to every charge, so the caller is the one billed');
            check(charges.every((c) => Boolean(c.idempotencyKey)), 'passes an idempotency key to every charge');
            const knownUpFront = !(route.stream && (typeof route.count === 'function' || typeof route.chargeOn === 'function'));
            if (knownUpFront) check((good.response.headers.get('x-charged-event') ?? '').includes(charges[0].eventName), 'tells the caller what was charged (x-charged-event header)');
        }
    }
    if (live) continue;

    const first = examples[0];

    // 2. Upstream failure
    if (first.expect?.upstreamCalls === 0) continue;
    reset();
    nextUpstreamResponse = { status: 500, json: { error: 'simulated upstream failure' } };
    const bad = await call(route, first);
    check(bad.response.status === 500, 'passes an upstream error status through', `got ${bad.response.status}`);
    if (events.length && route.chargeOn === undefined) check(charges.length === 0, 'failed upstream call charges nothing', `charged ${describe(chargedMap())}`);

    // 3. Upstream says the owner's key or account is the problem
    if (first.expect?.upstreamCalls !== 0) {
        for (const status of ownerErrorStatuses) {
            reset();
            nextUpstreamResponse = { status, json: { error: 'Invalid API key, please upgrade your plan' } };
            const owner = await call(route, first);
            check(owner.response.status === 503 && !owner.text.includes('upgrade your plan'), `upstream ${status} reaches the caller as a neutral 503`, `got ${owner.response.status}: ${owner.text.slice(0, 120)}`);
            check(charges.length === 0, `upstream ${status} charges nothing`);
        }
    }

    // 4. Charging failure
    const wouldCharge = events.length > 0 && Object.keys(expectedCharges(route, first) ?? { unknown: 1 }).length > 0;
    if (wouldCharge && (config.onChargeFailure ?? 'fail') === 'fail' && !route.stream) {
        reset();
        failCharges = true;
        nextUpstreamResponse = { status: 200, json: first.mockResponse ?? { ok: true }, headers: first.mockHeaders };
        const unpaid = await call(route, first);
        failCharges = false;
        check(unpaid.response.status === 500 && unpaid.text.includes('charg'), 'a call that cannot be charged returns an error, not the result', `got ${unpaid.response.status}: ${unpaid.text.slice(0, 120)}`);
        if (route.undo) {
            check(upstreamCalls.length >= 2, 'undo calls the upstream API after a failed charge', `upstream calls: ${upstreamCalls.map((c) => `${c.method} ${c.url}`).join(', ')}`);
            // A signed ID looks like <id>.<22 characters>. The upstream API only knows the raw ID.
            check(!upstreamCalls.slice(1).some((c) => /\.[A-Za-z0-9_-]{22}(?=[/?"]|$)/.test(`${c.url}${c.body}`)), 'undo sends the upstream\'s own ID, not the caller-bound one (use ctx.upstream.originalJson())');
        }
    }

    // 5. A key planted in a JSON body sent without a JSON content type
    if (!['GET', 'HEAD'].includes(route.method) && isPlainObject(first.body ?? {})) {
        reset();
        nextUpstreamResponse = { status: first.mockStatus ?? 200, json: first.mockResponse ?? { ok: true }, headers: first.mockHeaders };
        await call(route, first, { contentType: 'text/plain' });
        check(!upstreamCalls.some((c) => c.body.includes(CALLER_KEY)), 'does not forward a key in a JSON body sent as text/plain');
    }

    // 6. Caller-bound IDs
    if (route.ownedParams?.length) {
        reset();
        const foreign = await call(route, first, { signOwned: false });
        check(foreign.response.status === 404, 'rejects a resource ID that was not issued to this caller', `got ${foreign.response.status}`);
        check(upstreamCalls.length === 0, 'does not ask the upstream API about a foreign resource ID');
    }
}

// ------------------------------------------------------------------ limits
if (!live) {
    console.log('\nLimits');
    const limited = createPipeline({
        config: testConfig,
        apiKey,
        charging,
        limits: createLimits({ limits: { perUserRequestsPerMinute: 2 } }),
        signer,
        logger: quietLogger,
    });
    const limitedServer = createServer({ pipeline: limited, config: testConfig, logger: quietLogger });
    const limitedBase = await listen(limitedServer);
    const route = pipeline.routes.find((r) => !r.ownedParams?.length) ?? pipeline.routes[0];
    const example = examplesOf(route)[0];
    nextUpstreamResponse = { status: 200, json: example.mockResponse ?? { ok: true } };
    const statuses = [];
    for (let i = 0; i < 3; i += 1) {
        const hasBody = !['GET', 'HEAD'].includes(route.method);
        const r = await fetch(limitedBase + fill(route.path, example.params ?? {}), {
            method: route.method,
            headers: { 'x-apify-user-id': USER, 'x-actor-request-id': `limit-${i}`, ...(hasBody ? { 'content-type': 'application/json' } : {}) },
            body: hasBody ? JSON.stringify(example.body ?? {}) : undefined,
        });
        statuses.push(r.status);
        await r.arrayBuffer();
    }
    check(statuses[2] === 429, 'per-user rate limit answers 429 when exceeded', `statuses were ${statuses.join(', ')}`);
    limitedServer.close();
    limitedServer.closeAllConnections?.();

    // After a refused charge, the same caller's paid calls stop before they reach the upstream API.
    const paid = pipeline.routes.find((r) => routeEvents(r).length && !r.ownedParams?.length && !r.stream && Object.keys(expectedCharges(r, examplesOf(r)[0]) ?? { unknown: 1 }).length);
    if (paid) {
        const cooled = createPipeline({ config: { ...testConfig, chargeFailureCooldownSecs: 300 }, apiKey, charging, limits: createLimits({ limits: {} }), signer, logger: quietLogger });
        const cooledServer = createServer({ pipeline: cooled, config: testConfig, logger: quietLogger });
        const cooledBase = await listen(cooledServer);
        const ex = examplesOf(paid)[0];
        const send = async () => {
            const hasBody = !['GET', 'HEAD'].includes(paid.method);
            const r = await fetch(cooledBase + fill(paid.path, ex.params ?? {}) + (ex.query ? `?${new URLSearchParams(ex.query)}` : ''), {
                method: paid.method,
                headers: { 'x-apify-user-id': 'cooldown-user', 'x-actor-request-id': `cool-${Math.random()}`, ...(hasBody ? { 'content-type': 'application/json' } : {}) },
                body: hasBody ? JSON.stringify(ex.body ?? {}) : undefined,
            });
            await r.arrayBuffer();
            return r.status;
        };
        nextUpstreamResponse = { status: 200, json: ex.mockResponse ?? { ok: true }, headers: ex.mockHeaders };
        failCharges = true;
        await send();
        failCharges = false;
        reset();
        const after = await send();
        check(after === 402 && upstreamCalls.length === 0, 'after a refused charge, the caller\'s next paid call is refused before reaching the upstream API', `status ${after}, ${upstreamCalls.length} upstream calls`);
        cooledServer.close();
        cooledServer.closeAllConnections?.();
    }

    // A caller who keeps closing paid calls before the answer pays nothing, so after a few they are paused too.
    if (paid) {
        const guarded = createPipeline({ config: { ...testConfig, chargeFailureCooldownSecs: 300 }, apiKey, charging, limits: createLimits({ limits: {} }), signer, logger: quietLogger });
        const ex = examplesOf(paid)[0];
        const attempt = async (signal) => {
            const url = new URL(`http://actor${fill(paid.path, ex.params ?? {})}`);
            for (const [key, value] of Object.entries(ex.query ?? {})) url.searchParams.set(key, String(value));
            try {
                await guarded.execute({
                    method: paid.method,
                    pathname: url.pathname,
                    searchParams: url.searchParams,
                    headers: { 'content-type': 'application/json' },
                    body: ['GET', 'HEAD'].includes(paid.method) ? null : Buffer.from(JSON.stringify(ex.body ?? {})),
                    userId: 'disconnect-user',
                    requestId: `disconnect-${Math.random()}`,
                    signal,
                }, { writeHead() {}, write() {}, end() {} });
                return 200;
            } catch (err) {
                return err.status ?? 500;
            }
        };
        nextUpstreamResponse = { status: 200, json: ex.mockResponse ?? { ok: true }, headers: ex.mockHeaders };
        for (let i = 0; i < 5; i += 1) await attempt(AbortSignal.abort());
        reset();
        const status = await attempt(undefined);
        check(status === 402 && upstreamCalls.length === 0, 'after repeated disconnects on paid calls, the caller is paused before reaching the upstream API', `status ${status}, ${upstreamCalls.length} upstream calls`);
    }
}

// ------------------------------------------------------------------ result
console.log(`\n${passed} checks passed, ${failed} failed.${verbose ? '' : ' Run with --verbose to see every check.'}`);
actor.close();
actor.closeAllConnections?.();
mockUpstream.close();
mockUpstream.closeAllConnections?.();
process.exit(failed ? 1 : 0);
