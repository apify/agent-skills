/**
 * The core of the wrapper: takes one call, forwards it to the upstream API with the
 * owner's key, charges the caller, and returns the upstream response.
 *
 * It knows nothing about HTTP servers or the Apify SDK, so the server interface (server.js),
 * the input interface (input-mode.js) and the smoke test all drive the same code.
 */
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import { HttpError } from './errors.js';

/** Caller headers that are safe and useful to pass upstream. Routes can add more with `forwardHeaders`. */
const ALWAYS_FORWARDED = ['accept', 'accept-language', 'content-type'];

/** Caller headers that never go upstream, whatever a route says: credentials and platform internals. */
const NEVER_FORWARDED = /^(authorization|cookie|host|content-length|connection|transfer-encoding|proxy-.*|x-apify-.*|x-actor-.*|x-forwarded-.*)$/;

/**
 * Caller query parameters that look like credentials. They are dropped, so a caller can neither
 * read nor override the owner's key, and the caller's Apify token (?token=) never goes upstream.
 */
const CREDENTIAL_QUERY_PARAMS = ['token', 'api_key', 'apikey', 'api-key', 'access_token', 'auth_token'];

/**
 * Top-level body fields that look like credentials. Many APIs also accept the key in the body, and
 * would then bill the caller's own key or let the caller override the owner's. Dropped from JSON and
 * form bodies. Strip other names in a route's transformRequest.
 */
const CREDENTIAL_BODY_FIELDS = ['api_key', 'apikey', 'api-key', 'access_token', 'auth_token'];

function stripBodyCredentials(buffer, contentType = '') {
    if (/application\/x-www-form-urlencoded/i.test(contentType)) {
        const form = new URLSearchParams(buffer.toString('utf8'));
        const found = [...form.keys()].filter((key) => CREDENTIAL_BODY_FIELDS.includes(key.toLowerCase()));
        if (found.length === 0) return buffer;
        found.forEach((key) => form.delete(key));
        return Buffer.from(form.toString());
    }
    // Binary uploads and multipart forms are passed as they are. Anything else that parses as JSON is
    // treated as JSON, whatever the content type says, because many APIs parse it without checking.
    if (/^(multipart\/|image\/|audio\/|video\/|application\/(octet-stream|pdf|zip))/i.test(contentType)) return buffer;
    let parsed;
    try {
        parsed = JSON.parse(buffer.toString('utf8'));
    } catch {
        return buffer;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return buffer;
    const found = Object.keys(parsed).filter((key) => CREDENTIAL_BODY_FIELDS.includes(key.toLowerCase()));
    if (found.length === 0) return buffer;
    found.forEach((key) => delete parsed[key]);
    return Buffer.from(JSON.stringify(parsed));
}

/** Upstream response headers handed back to the caller. Everything else stays behind. */
const RETURNED_HEADERS = ['content-type', 'content-disposition', 'content-language', 'cache-control', 'etag', 'last-modified', 'location', 'retry-after'];

/** Upstream statuses that mean "the owner's key or account has a problem", not "the caller did something wrong". */
const DEFAULT_OWNER_ERROR_STATUSES = [401, 402];

const PARAM = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const STREAM_TAIL_BYTES = 64 * 1024;

const normalizePath = (path) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

/** The events a route can charge: [] for a free route. */
export const routeEvents = (route) => (route.event == null ? [] : [route.event].flat());

export function compileRoutes(routes) {
    return routes.map((route) => {
        const path = normalizePath(route.path);
        const paramNames = [...path.matchAll(PARAM)].map((m) => m[1]);
        const pattern = path
            .split(PARAM)
            .map((part, i) => (i % 2 === 1 ? '([^/]+)' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
            .join('');
        return { ...route, method: route.method.toUpperCase(), path, paramNames, regex: new RegExp(`^${pattern}$`) };
    });
}

/**
 * @returns {{ route: object, params: Record<string, string> } | { allowed: string[] } | null}
 *   the matching route, the methods allowed on this path if only the method is wrong, or null
 */
export function matchRoute(compiledRoutes, method, pathname) {
    const path = normalizePath(pathname);
    const allowed = [];
    for (const route of compiledRoutes) {
        const match = route.regex.exec(path);
        if (!match) continue;
        if (route.method !== method.toUpperCase()) {
            allowed.push(route.method);
            continue;
        }
        const params = {};
        route.paramNames.forEach((name, i) => {
            params[name] = match[i + 1];
        });
        return { route, params };
    }
    return allowed.length ? { allowed } : null;
}

/**
 * Turns what a route's `count` returned into a list of charges.
 * A route with one event returns a number. A route with several events returns { eventName: number }.
 */
export function normalizeCharges(route, raw) {
    const events = routeEvents(route);
    let entries;
    if (Array.isArray(route.event)) {
        if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new Error(`count must return an object like { "${events[0]}": 1 } for a route with several events, got ${JSON.stringify(raw)}`);
        }
        entries = Object.entries(raw);
        for (const [event] of entries) {
            if (!events.includes(event)) throw new Error(`count returned event "${event}", which is not in the route's event list`);
        }
    } else {
        entries = [[route.event, raw]];
    }
    return entries.map(([event, count]) => {
        if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
            throw new Error(`count for "${event}" resolved to ${count}, expected a number >= 0`);
        }
        return { event, count: Math.ceil(count) };
    }).filter(({ count }) => count > 0);
}

function decodeParam(name, raw) {
    let value;
    try {
        value = decodeURIComponent(raw);
    } catch {
        throw new HttpError(400, 'invalid-path-parameter', `Path parameter "${name}" is not valid URL encoding.`);
    }
    // A parameter is one path segment. Refuse anything that could walk to another upstream endpoint.
    if (value === '.' || value === '..' || /[/\\]/.test(value)) {
        throw new HttpError(400, 'invalid-path-parameter', `Path parameter "${name}" must not contain slashes or dot segments.`);
    }
    return value;
}

function lazyBody(getBuffer) {
    let parsed;
    let done = false;
    return {
        reset: () => {
            done = false;
        },
        text: () => getBuffer()?.toString('utf8') ?? '',
        json: () => {
            if (!done) {
                done = true;
                try {
                    parsed = JSON.parse(getBuffer()?.toString('utf8') ?? '');
                } catch {
                    parsed = undefined;
                }
            }
            return parsed;
        },
    };
}

/**
 * @param {object} options
 * @param {object} options.config            src/config.js
 * @param {string} [options.apiKey]          upstream API key
 * @param {object} options.charging          { enabled, remaining(eventName), charge({ eventName, count, requestId, idempotencyKey }) }
 * @param {object} options.limits            from createLimits()
 * @param {object} options.signer            from createSigner()
 * @param {object} options.logger            { info, warning, error }
 * @param {string|null} [options.pool]       run pool, exposed to hooks as ctx.pool
 * @param {Function} [options.fetchImpl]
 */
export function createPipeline({ config, apiKey, charging, limits, signer, logger, pool = null, actorUrl = 'http://localhost:4321', fetchImpl = fetch }) {
    const routes = compileRoutes(config.routes);
    const { upstream } = config;
    const auth = upstream.auth ?? { type: 'none' };
    const baseUrl = upstream.baseUrl.replace(/\/+$/, '');
    const ownerErrorStatuses = upstream.ownerErrorStatuses ?? DEFAULT_OWNER_ERROR_STATUSES;
    const droppedQuery = new Set([...CREDENTIAL_QUERY_PARAMS, ...(upstream.dropQuery ?? []), ...(auth.type === 'query' ? [auth.name] : [])].map((n) => n.toLowerCase()));

    // A caller whose charge was refused (spending limit, no credit) gets a cooldown on paid calls,
    // so retrying does not spend the owner's upstream credits on calls nobody pays for.
    const CHARGE_COOLDOWN_MS = (config.chargeFailureCooldownSecs ?? 300) * 1000;
    const unchargeableUntil = new Map();

    // A caller who closes the connection before the answer pays nothing, while the upstream API may still bill
    // the owner. A few disconnects are normal; repeated ones on paid routes trigger the same cooldown.
    const MAX_UNPAID_DISCONNECTS = 5;
    const disconnects = new Map();
    function noteUnpaidDisconnect(userId, route) {
        if (!userId || routeEvents(route).length === 0 || CHARGE_COOLDOWN_MS <= 0) return;
        const now = Date.now();
        let entry = disconnects.get(userId);
        if (!entry || now - entry.since > CHARGE_COOLDOWN_MS) entry = { count: 0, since: now };
        entry.count += 1;
        if (disconnects.size > 10_000) disconnects.clear();
        disconnects.set(userId, entry);
        if (entry.count >= MAX_UNPAID_DISCONNECTS) {
            unchargeableUntil.set(userId, now + CHARGE_COOLDOWN_MS);
            disconnects.delete(userId);
            logger.warning(`Caller ${userId} closed ${MAX_UNPAID_DISCONNECTS} paid calls before they could be charged. Paid calls paused for the cooldown.`);
        }
    }

    function buildUpstreamRequest(route, call, params) {
        const path = (route.upstreamPath ?? route.path).replace(PARAM, (_, name) => {
            if (!(name in params)) {
                throw new Error(`Route ${route.method} ${route.path}: upstreamPath uses {${name}}, which is not a parameter of path.`);
            }
            return encodeURIComponent(params[name]);
        });
        const url = new URL(baseUrl + path);

        for (const [key, value] of call.searchParams ?? []) {
            if (droppedQuery.has(key.toLowerCase())) continue;
            if (route.allowQuery && !route.allowQuery.includes(key)) continue;
            url.searchParams.append(key, value);
        }
        for (const [key, value] of Object.entries(route.upstreamQuery ?? {})) {
            url.searchParams.set(key, String(value));
        }

        const headers = { ...(upstream.headers ?? {}) };
        const forwarded = [...ALWAYS_FORWARDED, ...(route.forwardHeaders ?? []).map((h) => h.toLowerCase())];
        for (const name of forwarded) {
            if (NEVER_FORWARDED.test(name)) continue;
            if (call.headers?.[name] !== undefined) headers[name] = call.headers[name];
        }

        const method = (route.upstreamMethod ?? route.method).toUpperCase();
        const hasBody = !['GET', 'HEAD'].includes(method) && call.body?.length > 0;
        const body = hasBody ? stripBodyCredentials(call.body, call.headers?.['content-type']) : undefined;
        return { url, method, headers, body };
    }

    function applyAuth(request) {
        switch (auth.type) {
            case 'none':
                return;
            case 'bearer':
                request.headers.authorization = `Bearer ${apiKey}`;
                return;
            case 'basic':
                request.headers.authorization = `Basic ${Buffer.from(apiKey ?? '').toString('base64')}`;
                return;
            case 'header':
                request.headers[auth.name.toLowerCase()] = `${auth.prefix ?? ''}${apiKey}`;
                return;
            case 'query':
                request.url.searchParams.set(auth.name, apiKey);
                return;
            case 'custom':
                auth.apply(request, apiKey);
                return;
            default:
                throw new Error(`Unknown upstream.auth.type "${auth.type}" in src/config.js.`);
        }
    }

    /**
     * An extra authenticated call to the upstream API, for hooks: cancel a job, fetch a missing detail.
     * @returns {Promise<{ status: number, ok: boolean, headers: Headers, json: () => any, text: () => string }>}
     */
    async function callUpstream(method, path, { query = {}, body, headers = {}, timeoutSecs = 30 } = {}) {
        const request = { url: new URL(baseUrl + path), method: method.toUpperCase(), headers: { ...(upstream.headers ?? {}), ...headers }, body: undefined };
        for (const [key, value] of Object.entries(query)) request.url.searchParams.set(key, String(value));
        if (body !== undefined) {
            request.body = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
            request.headers['content-type'] ??= 'application/json';
        }
        applyAuth(request);
        const response = await fetchImpl(request.url, { method: request.method, headers: request.headers, body: request.body, redirect: 'manual', signal: AbortSignal.timeout(timeoutSecs * 1000) });
        const buffer = Buffer.from(await response.arrayBuffer());
        const parsed = lazyBody(() => buffer);
        return { status: response.status, ok: response.ok, headers: response.headers, json: parsed.json, text: parsed.text };
    }

    /** A call was made upstream but could not be charged: give the route a chance to undo it (cancel the job). */
    async function undo(ctx) {
        if (!ctx.route.undo) return;
        try {
            await ctx.route.undo(ctx);
        } catch (err) {
            logger.error(`${ctx.route.method} ${ctx.route.path}: undo failed after a failed charge. The upstream work may still run on the owner's account.`, { message: err.message });
        }
    }

    /** Decides what a finished upstream call costs, and charges it. */
    async function settle(ctx) {
        const { route } = ctx;
        if (routeEvents(route).length === 0) return { charges: [], charged: false };

        let plan;
        try {
            let billable = ctx.upstream.ok;
            if (route.chargeOn === 'always') billable = true;
            else if (typeof route.chargeOn === 'function') billable = Boolean(await route.chargeOn(ctx));
            if (!billable) return { charges: [], charged: false };

            const raw = typeof route.count === 'function' ? await route.count(ctx) : (route.count ?? 1);
            plan = normalizeCharges(route, raw);
        } catch (err) {
            logger.error(`${route.method} ${route.path}: the count/chargeOn function failed. Nothing was charged.`, { message: err.message });
            await undo(ctx);
            throw new HttpError(500, 'charge-count-error', 'The call could not be billed, so its result was not returned. You were not charged.');
        }
        if (plan.length === 0) return { charges: [], charged: false };

        // Not a pay-per-event Actor (yet), or a local run: nothing to charge, report what it would have been.
        if (!charging.enabled) return { charges: plan, charged: false };

        for (const { event, count } of plan) {
            try {
                const result = await charging.charge({
                    eventName: event,
                    count,
                    requestId: ctx.requestId,
                    // The platform deduplicates on this key, so a retried charge is never counted twice.
                    idempotencyKey: `${ctx.requestId ?? randomUUID()}:${event}`,
                });
                if (result && result.chargedCount < count) {
                    throw new Error(
                        `only ${result.chargedCount} of ${count} "${event}" events were charged. `
                        + 'Either the event is missing in the Actor\'s pricing, or the caller reached their spending limit.',
                    );
                }
            } catch (err) {
                logger.error(`${route.method} ${route.path}: charging failed.`, { event, count, message: err.message });
                if (ctx.userId && CHARGE_COOLDOWN_MS > 0) {
                    if (unchargeableUntil.size > 10_000) unchargeableUntil.clear();
                    unchargeableUntil.set(ctx.userId, Date.now() + CHARGE_COOLDOWN_MS);
                }
                if (config.onChargeFailure === 'serve') return { charges: plan, charged: false };
                await undo(ctx);
                throw new HttpError(500, 'charging-failed', 'The call could not be billed, so its result was not returned.');
            }
        }
        return { charges: plan, charged: true };
    }

    function responseHeaders(ctx, settled) {
        const headers = {};
        for (const name of RETURNED_HEADERS) {
            const value = ctx.upstream.headers.get(name);
            if (value !== null) headers[name] = value;
        }
        if (settled.charges.length) {
            headers['x-charged-event'] = settled.charges.map((c) => c.event).join(', ');
            headers['x-charged-count'] = settled.charges.map((c) => c.count).join(', ');
        }
        return headers;
    }

    /**
     * Runs one call end to end.
     *
     * @param {object} call  { method, pathname, searchParams, headers, body, userId, requestId, signal }
     *                       headers: plain object with lower-case names. body: Buffer or null.
     * @param {object} sink  { writeHead(status, headers), write(chunk), end(chunk) }
     * @returns {Promise<object>} summary for logging: { route, status, charges, charged }
     * @throws {HttpError} when the Actor itself rejects the call. Nothing has been written to the sink then.
     */
    async function execute(call, sink) {
        const found = matchRoute(routes, call.method, call.pathname);
        if (!found) {
            throw new HttpError(404, 'endpoint-not-found', `No endpoint ${call.method} ${call.pathname}. Send GET / for the list of endpoints.`);
        }
        if (found.allowed) {
            throw new HttpError(405, 'method-not-allowed', `${call.pathname} accepts ${found.allowed.join(', ')}.`, { allow: found.allowed.join(', ') });
        }
        const { route } = found;

        const params = {};
        for (const [name, raw] of Object.entries(found.params)) params[name] = decodeParam(name, raw);
        // Caller-bound IDs fail closed: without the caller's identity, nothing can be bound or checked.
        if ((route.ownedParams?.length || route.undo || route.requiresCaller) && !call.userId) {
            throw new HttpError(401, 'caller-unknown', 'This endpoint needs to know who is calling. Call it through the Actor\'s server URL with your Apify token.');
        }
        for (const name of route.ownedParams ?? []) {
            const id = signer.verify(call.userId, params[name]);
            // Same answer for "does not exist" and "belongs to someone else", so IDs cannot be probed.
            if (id === null) throw new HttpError(404, 'resource-not-found', `No such ${name} for this account.`);
            params[name] = id;
        }

        if (routeEvents(route).length && call.userId && (unchargeableUntil.get(call.userId) ?? 0) > Date.now()) {
            throw new HttpError(402, 'charge-refused', 'Recent calls could not be billed to your Apify account (a refused charge, or connections closed before the answer). Check its spending limit and payment method, then try again in a few minutes.');
        }

        const release = limits.acquire(call.userId, { paid: routeEvents(route).length > 0 });
        try {
            if (charging.enabled && routeEvents(route).some((event) => charging.remaining(event) < 1)) {
                throw new HttpError(402, 'charge-limit-reached', 'The maximum cost set for this run has been reached. Raise the limit to continue.');
            }

            // Hooks see the body with credential fields already removed, so rebuilding the upstream body
            // from ctx.request.json() cannot put a caller's key back.
            const cleanBody = call.body?.length ? stripBodyCredentials(call.body, call.headers?.['content-type']) : call.body;
            const requestBody = lazyBody(() => cleanBody);
            const ctx = {
                route,
                userId: call.userId,
                requestId: call.requestId,
                pool,
                log: logger,
                actorUrl,
                request: {
                    method: call.method,
                    path: call.pathname,
                    params,
                    query: Object.fromEntries(call.searchParams ?? []),
                    headers: call.headers ?? {},
                    body: cleanBody ?? null,
                    // A fresh copy on every call, so a hook that edits it does not change what count() sees.
                    json: () => {
                        const parsed = requestBody.json();
                        return parsed === undefined ? undefined : structuredClone(parsed);
                    },
                },
                upstream: null,
                signId: (id) => {
                    if (!call.userId) throw new HttpError(401, 'caller-unknown', 'This endpoint needs to know who is calling. Call it through the Actor\'s server URL with your Apify token.');
                    return signer.sign(call.userId, id);
                },
                callUpstream,
            };

            const request = buildUpstreamRequest(route, { ...call, body: cleanBody }, params);
            if (route.transformRequest) await route.transformRequest(request, ctx);
            applyAuth(request);

            const timeoutMs = (route.timeoutSecs ?? upstream.timeoutSecs ?? 120) * 1000;
            const signals = [AbortSignal.timeout(timeoutMs)];
            if (call.signal) signals.push(call.signal);
            const signal = AbortSignal.any(signals);

            const upstreamFailure = (err) => {
                if (call.signal?.aborted) {
                    noteUnpaidDisconnect(call.userId, route);
                    return new HttpError(499, 'client-closed-request', 'The caller closed the connection.');
                }
                if (err.name === 'TimeoutError') return new HttpError(504, 'upstream-timeout', `The upstream API did not answer within ${timeoutMs / 1000} seconds. You were not charged.`);
                // Log the cause, but never the URL: with query auth it contains the API key.
                logger.error(`${route.method} ${route.path}: upstream call failed.`, { message: err.cause?.message ?? err.message });
                return new HttpError(502, 'upstream-unreachable', 'The upstream API could not be reached. You were not charged.');
            };

            let response;
            try {
                response = await fetchImpl(request.url, {
                    method: request.method,
                    headers: request.headers,
                    body: request.body,
                    // Never follow redirects with our credentials attached. The caller gets the 3xx and decides.
                    redirect: 'manual',
                    signal,
                });
            } catch (err) {
                throw upstreamFailure(err);
            }

            const ok = response.status >= 200 && response.status < 300;
            let buffer = null;
            let originalBuffer = null;
            const upstreamBody = lazyBody(() => buffer);
            const originalBody = lazyBody(() => originalBuffer);
            ctx.upstream = {
                status: response.status,
                ok,
                headers: new Headers(response.headers),
                get body() { return buffer; },
                // Hooks may replace the body with a Buffer, a string, or an object (serialized as JSON).
                set body(value) {
                    buffer = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
                    upstreamBody.reset();
                },
                json: upstreamBody.json,
                text: upstreamBody.text,
                streamTail: '',
                // The body as the upstream API sent it, before transformResponse changed it (e.g. signed an ID).
                originalJson: () => originalBody.json(),
            };

            // Buffered (default): read the whole answer, charge, then respond. No charge, no data.
            if (!(route.stream && ok && response.body)) {
                try {
                    buffer = Buffer.from(await response.arrayBuffer());
                    originalBuffer = buffer;
                } catch (err) {
                    throw upstreamFailure(err);
                }
                // A rejected key or an exhausted account is the owner's problem. Callers get a neutral
                // answer instead of the upstream's "check your API key" or "upgrade your plan".
                if (ownerErrorStatuses.includes(response.status)) {
                    logger.error(`${route.method} ${route.path}: upstream answered ${response.status}, which points at the owner's key or account.`, { body: buffer.toString('utf8').slice(0, 300) });
                    throw new HttpError(503, 'service-unavailable', 'The service is temporarily unavailable. You were not charged. Please try again later.');
                }
                if (route.transformResponse) {
                    try {
                        await route.transformResponse(ctx);
                    } catch (err) {
                        // The upstream work already happened. Undo it before answering with the error.
                        if (ctx.upstream.ok) await undo(ctx);
                        throw err;
                    }
                }
                const settled = await settle(ctx);
                sink.writeHead(response.status, { ...responseHeaders(ctx, settled), 'content-length': String(buffer.length) });
                await sink.end(buffer);
                return { route, status: response.status, ...settled };
            }

            // Streaming. A fixed price is charged up front, once the upstream API has accepted the call.
            // A usage-based price is only known at the end, so it is charged just before the stream closes.
            const fixedPrice = typeof route.count !== 'function' && typeof route.chargeOn !== 'function';
            let settled = { charges: [], charged: false };
            if (fixedPrice) {
                try {
                    settled = await settle(ctx);
                } catch (err) {
                    await response.body.cancel().catch(() => {});
                    throw err;
                }
            }
            sink.writeHead(response.status, responseHeaders(ctx, settled));
            let tail = Buffer.alloc(0);
            try {
                for await (const chunk of response.body) {
                    await sink.write(chunk);
                    tail = Buffer.concat([tail, chunk]);
                    if (tail.length > STREAM_TAIL_BYTES) tail = tail.subarray(tail.length - STREAM_TAIL_BYTES);
                }
            } catch (err) {
                logger.error(`${route.method} ${route.path}: the upstream stream broke off.`, { message: err.message });
                sink.destroy?.();
                return { route, status: response.status, ...settled, aborted: true };
            }
            if (!fixedPrice) {
                ctx.upstream.streamTail = tail.toString('utf8');
                // The data is already out, so a failed charge can only be logged here.
                settled = await settle(ctx).catch(() => ({ charges: [], charged: false }));
            }
            await sink.end();
            return { route, status: response.status, ...settled };
        } finally {
            release();
        }
    }

    return { routes, execute };
}
