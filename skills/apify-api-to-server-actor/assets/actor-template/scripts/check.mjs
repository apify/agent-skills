#!/usr/bin/env node
/**
 * Static consistency check. Run it after every change to src/config.js, pricing.json
 * or .actor/openapi.json:
 *
 *     npm run check
 *
 * The wrapper is described in four places that must agree: the routes (what the Actor does),
 * the pricing file (what it costs), the OpenAPI schema (what users are told) and actor.json
 * (how it is deployed). This script finds the disagreements before users or the build do.
 *
 * Exit code 1 if there are errors. Warnings do not fail the check.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const error = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

async function readJson(relativePath, { required = true } = {}) {
    try {
        return JSON.parse(await readFile(join(root, relativePath), 'utf8'));
    } catch (err) {
        if (required) error(`${relativePath}: ${err.code === 'ENOENT' ? 'file is missing' : `not valid JSON (${err.message})`}`);
        return null;
    }
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const TIERS = ['FREE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
const CREDENTIAL_QUERY_PARAMS = ['token', 'api_key', 'apikey', 'api-key', 'access_token', 'auth_token'];
const PARAM = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const paramsOf = (path) => [...String(path).matchAll(PARAM)].map((m) => m[1]);
const normalize = (path) => (path.length > 1 ? path.replace(/\/+$/, '') : path);
const TODO = /\bTODO\b|<FILL-IN/;
const URL_PLACEHOLDER = /TODO-USERNAME|TODO-ACTOR-NAME|<username>|<actor-name>|<user>--/i;
const KEY_PLACEHOLDER = /YOUR[_-]?API[_-]?KEY|<your[ _-]?api[ _-]?key>|YOUR_TOKEN_HERE/i;

// ---------------------------------------------------------------- src/config.js
let config = null;
try {
    config = (await import(pathToFileURL(join(root, 'src/config.js')).href)).default;
} catch (err) {
    error(`src/config.js: cannot be loaded (${err.message})`);
}

const routeKeys = new Set();
const usedEvents = new Set();
if (config) {
    const { upstream = {}, routes = [], limits = {} } = config;

    if (!/^https:\/\//.test(upstream.baseUrl ?? '')) error('src/config.js: upstream.baseUrl must be an https:// URL.');
    if (/api\.example\.com/.test(upstream.baseUrl ?? '')) error('src/config.js: upstream.baseUrl is still the template placeholder.');
    if (/\/$/.test(upstream.baseUrl ?? '')) warn('src/config.js: upstream.baseUrl should not end with a slash.');

    const authType = upstream.auth?.type;
    if (!['bearer', 'header', 'query', 'basic', 'custom', 'none'].includes(authType)) {
        error(`src/config.js: upstream.auth.type "${authType}" is not one of bearer, header, query, basic, custom, none.`);
    }
    if (['header', 'query'].includes(authType) && !upstream.auth.name) error(`src/config.js: upstream.auth.name is required for auth type "${authType}".`);
    if (authType === 'custom' && typeof upstream.auth.apply !== 'function') error('src/config.js: upstream.auth.apply must be a function for auth type "custom".');
    if ((upstream.timeoutSecs ?? 120) >= 300) warn('src/config.js: upstream.timeoutSecs is 300 or more. The platform fails a request that gets no response within 5 minutes.');
    if (upstream.ownerErrorStatuses !== undefined && (!Array.isArray(upstream.ownerErrorStatuses) || upstream.ownerErrorStatuses.some((s) => !Number.isInteger(s)))) {
        error('src/config.js: upstream.ownerErrorStatuses must be a list of HTTP status codes.');
    }

    // A key pasted into the config would be committed and, for a public Actor with visible source, published.
    const source = await readFile(join(root, 'src/config.js'), 'utf8');
    if (/(api[_-]?key|token|secret|password)\s*:\s*['"`][A-Za-z0-9_\-.]{16,}['"`]/i.test(source)) {
        error('src/config.js: looks like it contains a hard-coded credential. Keep the upstream key in the UPSTREAM_API_KEY secret only.');
    }

    if (!Array.isArray(routes) || routes.length === 0) error('src/config.js: routes is empty.');
    for (const [i, route] of routes.entries()) {
        const label = `src/config.js: routes[${i}] (${route.method} ${route.path})`;
        if (!HTTP_METHODS.includes(String(route.method).toUpperCase())) error(`${label}: unknown method.`);
        if (typeof route.path !== 'string' || !route.path.startsWith('/')) {
            error(`${label}: path must start with "/".`);
            continue;
        }
        if (/[?#*]/.test(route.path)) error(`${label}: path must not contain a query string, fragment or wildcard. List every endpoint explicitly.`);

        const key = `${String(route.method).toUpperCase()} ${normalize(route.path).replace(PARAM, '{}')}`;
        if (routeKeys.has(key)) error(`${label}: duplicate route.`);
        routeKeys.add(key);

        const events = route.event == null ? [] : [route.event].flat();
        if (!('event' in route)) error(`${label}: "event" is missing. Use an event name from pricing.json, null if the endpoint is free, or a list of events.`);
        if (events.some((e) => typeof e !== 'string')) error(`${label}: event names must be strings.`);
        events.forEach((e) => usedEvents.add(e));
        if (Array.isArray(route.event) && typeof route.count !== 'function') {
            error(`${label}: a route with several events needs count: (ctx) => ({ "${events[0] ?? 'event'}": n, ... }).`);
        }

        const pathParams = paramsOf(route.path);
        for (const name of paramsOf(route.upstreamPath ?? '')) {
            if (!pathParams.includes(name)) error(`${label}: upstreamPath uses {${name}}, which is not in path.`);
        }
        for (const name of route.ownedParams ?? []) {
            if (!pathParams.includes(name)) error(`${label}: ownedParams lists "${name}", which is not in path.`);
        }
        if (route.upstreamPath && /^https?:/.test(route.upstreamPath)) error(`${label}: upstreamPath must be a path, not a URL.`);
        if (route.chargeOn !== undefined && !['success', 'always'].includes(route.chargeOn) && typeof route.chargeOn !== 'function') {
            error(`${label}: chargeOn must be "success", "always" or a function.`);
        }
        if (route.count !== undefined && typeof route.count !== 'function' && !(Number.isInteger(route.count) && route.count >= 0)) {
            error(`${label}: count must be a non-negative integer or a function.`);
        }
        if (events.length === 0 && route.count !== undefined) warn(`${label}: count is ignored because the endpoint is free.`);
        if (!route.summary) warn(`${label}: no summary. It is shown in the endpoint index and the OpenAPI schema.`);

        const examples = route.examples ?? (route.example ? [route.example] : []);
        if (examples.length === 0) warn(`${label}: no examples, so "npm run smoke" can only test it with an empty call.`);
        if (events.length && (typeof route.count === 'function' || typeof route.chargeOn === 'function') && examples.some((ex) => !ex.expect)) {
            warn(`${label}: the price depends on the call, but not every example has "expect", so the smoke test cannot verify the charged amount.`);
        }
        for (const example of examples) {
            for (const name of pathParams) {
                if (example.params?.[name] === undefined) warn(`${label}: an example is missing params.${name}.`);
            }
            const expectEvents = example.expect?.charges ? Object.keys(example.expect.charges) : (example.expect?.event ? [example.expect.event] : []);
            for (const e of expectEvents) if (!events.includes(e)) error(`${label}: an example expects event "${e}", which the route does not charge.`);
        }
    }

    const free = limits.freeUsers;
    if (free && !['allow', 'limit', 'block'].includes(free.policy)) error('src/config.js: limits.freeUsers.policy must be allow, limit or block.');
    if (config.onChargeFailure && !['fail', 'serve'].includes(config.onChargeFailure)) error('src/config.js: onChargeFailure must be "fail" or "serve".');
}

// ---------------------------------------------------------------- pricing.json
const pricing = await readJson('pricing.json');
if (pricing) {
    const events = pricing.events ?? {};
    const names = Object.keys(events);
    if (names.length === 0 && usedEvents.size > 0) error('pricing.json: no events defined.');

    for (const eventName of usedEvents) {
        if (!events[eventName]) error(`pricing.json: event "${eventName}" is charged by a route but not priced.`);
    }
    for (const [name, event] of Object.entries(events)) {
        const label = `pricing.json: events.${name}`;
        if (!/^[a-z][a-z0-9-]*$/.test(name)) error(`${label}: event names must be lower-case words joined by hyphens.`);
        if (name.startsWith('apify-')) error(`${label}: "apify-" events are synthetic, the platform charges them itself. Use your own event name.`);
        if (!usedEvents.has(name)) warn(`${label}: priced but not charged by any route.`);
        if (!event.title || !event.description) error(`${label}: title and description are required. Users see them on the Pricing tab.`);
        const hasFlat = typeof event.priceUsd === 'number';
        const hasTiers = event.tieredPriceUsd && typeof event.tieredPriceUsd === 'object';
        if (hasFlat === Boolean(hasTiers)) error(`${label}: set exactly one of priceUsd or tieredPriceUsd.`);
        const prices = hasTiers ? Object.values(event.tieredPriceUsd) : [event.priceUsd];
        if (prices.some((p) => typeof p !== 'number' || !(p > 0))) error(`${label}: every price must be a number above 0.`);
        if (prices.some((p) => typeof p === 'number' && p > 0 && p < 0.00001)) {
            warn(`${label}: price below $0.00001. Charge a bigger unit instead (for example per 1,000 tokens) and round the count up.`);
        }
        if (prices.some((p) => typeof p === 'number' && Math.abs(p * 1e6 - Math.round(p * 1e6)) > 1e-6)) {
            warn(`${label}: price has more than 6 decimals. Round it, Console shows and stores fewer.`);
        }
        if (hasTiers) {
            for (const tier of Object.keys(event.tieredPriceUsd)) if (!TIERS.includes(tier)) error(`${label}: unknown tier "${tier}".`);
            for (const tier of ['FREE', 'BRONZE', 'SILVER', 'GOLD']) if (!(tier in event.tieredPriceUsd)) error(`${label}: tieredPriceUsd is missing ${tier}.`);
        }
        if (typeof event.upstreamPriceUsd !== 'number') warn(`${label}: upstreamPriceUsd is missing, so "npm run pricing" cannot compare with the direct price.`);
    }
    const primary = names.filter((name) => events[name].primary);
    if (names.length > 0 && primary.length !== 1) error(`pricing.json: exactly one event must have "primary": true (found ${primary.length}).`);
    if (names.length > 10) warn(`pricing.json: ${names.length} events. Fewer events are easier for users to predict. Merge endpoints that cost the same.`);

    const upstream = pricing.upstream ?? {};
    if (!upstream.pricingUrl || /example\.com/.test(upstream.pricingUrl)) warn('pricing.json: upstream.pricingUrl should point to the page the prices were read from.');
    if (!upstream.basis || TODO.test(upstream.basis)) warn('pricing.json: upstream.basis should say which published rate the prices are derived from.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(upstream.retrievedOn ?? '')) warn('pricing.json: upstream.retrievedOn should be the date (YYYY-MM-DD) the prices were read.');
}

// ---------------------------------------------------------------- .actor/actor.json
const actor = await readJson('.actor/actor.json');
if (actor) {
    if (actor.usesStandbyMode !== true) error('.actor/actor.json: usesStandbyMode must be true. That is what makes this a Server Actor.');
    if (!actor.webServerSchema) error('.actor/actor.json: webServerSchema is missing, so the Server tab cannot list the endpoints.');
    if (actor.name === 'my-api-wrapper') error('.actor/actor.json: name is still the template placeholder.');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(actor.name ?? '')) error('.actor/actor.json: name must be lower-case letters, digits and hyphens.');
    for (const field of ['title', 'description']) {
        if (!actor[field] || TODO.test(actor[field])) error(`.actor/actor.json: ${field} is not filled in.`);
    }
    if (TODO.test(actor.meta?.generatedBy ?? '')) warn('.actor/actor.json: meta.generatedBy is not filled in.');

    const keyVar = config?.upstream?.apiKeyEnvVar ?? 'UPSTREAM_API_KEY';
    const needsKey = (config?.upstream?.auth?.type ?? 'none') !== 'none';
    const value = actor.environmentVariables?.[keyVar];
    if (needsKey && value === undefined) {
        warn(`.actor/actor.json: environmentVariables.${keyVar} is not set. Set it to "@<secretName>" or add the variable as a secret in Apify Console.`);
    } else if (value !== undefined && !String(value).startsWith('@')) {
        error(`.actor/actor.json: environmentVariables.${keyVar} must reference a secret ("@name"), never hold the key itself.`);
    }

    // The free-plan policy is the partner's decision and can be changed here without touching code.
    const env = actor.environmentVariables ?? {};
    if (env.FREE_USERS_POLICY !== undefined && !['allow', 'limit', 'block'].includes(String(env.FREE_USERS_POLICY).trim().toLowerCase())) {
        error('.actor/actor.json: FREE_USERS_POLICY must be allow, limit or block.');
    }
    if (env.FREE_USERS_MAX_REQUESTS_PER_DAY !== undefined && !/^\d+$/.test(String(env.FREE_USERS_MAX_REQUESTS_PER_DAY).trim())) {
        error('.actor/actor.json: FREE_USERS_MAX_REQUESTS_PER_DAY must be a whole number.');
    }
    const policy = String(env.FREE_USERS_POLICY ?? config?.limits?.freeUsers?.policy ?? 'allow').trim().toLowerCase();
    if (policy === 'limit' && !(Number(env.FREE_USERS_MAX_REQUESTS_PER_DAY ?? config?.limits?.freeUsers?.maxRequestsPerDay) > 0)) {
        warn('.actor/actor.json: FREE_USERS_POLICY is "limit" but no daily number is set, so free-plan callers get no paid calls at all.');
    }
}

// ---------------------------------------------------------------- .actor/openapi.json
const openapiPath = typeof actor?.webServerSchema === 'string' ? join('.actor', actor.webServerSchema) : null;
const openapi = openapiPath ? await readJson(openapiPath) : (actor?.webServerSchema ?? null);
if (openapi && typeof openapi === 'object') {
    const label = openapiPath ?? '.actor/actor.json: webServerSchema';
    if (!/^3\./.test(openapi.openapi ?? '')) error(`${label}: must be an OpenAPI 3.x document.`);
    if (!openapi.info?.title || TODO.test(openapi.info.title)) error(`${label}: info.title is not filled in.`);
    if (!openapi.info?.version) error(`${label}: info.version is required.`);

    const documented = new Set();
    for (const [path, item] of Object.entries(openapi.paths ?? {})) {
        for (const method of Object.keys(item)) {
            if (!HTTP_METHODS.includes(method.toUpperCase())) continue;
            const key = `${method.toUpperCase()} ${normalize(path).replace(PARAM, '{}')}`;
            documented.add(key);
            if (key === 'GET /') continue; // built-in endpoint index
            if (!routeKeys.has(key)) error(`${label}: documents ${method.toUpperCase()} ${path}, which is not a route in src/config.js.`);
            const operation = item[method];
            if (!operation.summary && !operation.description) warn(`${label}: ${method.toUpperCase()} ${path} has no summary or description.`);
            if (!operation.responses || Object.keys(operation.responses).length === 0) error(`${label}: ${method.toUpperCase()} ${path} has no responses (required by OpenAPI).`);
            if (TODO.test(JSON.stringify(operation))) warn(`${label}: ${method.toUpperCase()} ${path} still contains TODO placeholders.`);
            for (const p of operation.parameters ?? []) {
                if (p.in === 'path' && !paramsOf(path).includes(p.name)) error(`${label}: ${method.toUpperCase()} ${path} documents path parameter "${p.name}", which is not in the path.`);
                if (p.in === 'query' && CREDENTIAL_QUERY_PARAMS.includes(String(p.name).toLowerCase())) {
                    error(`${label}: ${method.toUpperCase()} ${path} documents the credential parameter "${p.name}". The Actor drops it, callers authenticate with their Apify token only.`);
                }
            }
            for (const name of paramsOf(path)) {
                if (!(operation.parameters ?? []).some((p) => p.in === 'path' && p.name === name)) error(`${label}: ${method.toUpperCase()} ${path} does not document path parameter "${name}".`);
            }
        }
    }
    for (const key of routeKeys) {
        if (!documented.has(key)) error(`${label}: route ${key.replace(/\{\}/g, '{param}')} from src/config.js is not documented.`);
    }

    // Every local $ref must resolve, or the build rejects the schema.
    const refs = new Set();
    const walk = (node) => {
        if (Array.isArray(node)) node.forEach(walk);
        else if (node && typeof node === 'object') {
            for (const [k, v] of Object.entries(node)) {
                if (k === '$ref' && typeof v === 'string') refs.add(v);
                else walk(v);
            }
        }
    };
    walk(openapi);
    for (const ref of refs) {
        if (!ref.startsWith('#/')) {
            error(`${label}: external $ref "${ref}". Inline it, the schema must be self-contained.`);
            continue;
        }
        const target = ref.slice(2).split('/').reduce((value, k) => value?.[k.replace(/~1/g, '/').replace(/~0/g, '~')], openapi);
        if (target === undefined) error(`${label}: $ref "${ref}" does not resolve.`);
    }

    // The schema is public and is what callers and AI agents read. Vendor leftovers mislead them.
    const auth = config?.upstream?.auth ?? {};
    const text = JSON.stringify(openapi);
    if (['header', 'query'].includes(auth.type) && new RegExp(`"name"\\s*:\\s*"${auth.name}"`, 'i').test(text)) {
        error(`${label}: documents the upstream credential parameter "${auth.name}". Callers authenticate with their Apify token only, remove it.`);
    }
    if (/"x-code-?samples"/i.test(text)) warn(`${label}: contains x-codeSamples copied from the vendor. They show the vendor's SDK and key, not calls to this Actor. Run "npm run openapi" again or remove them.`);
    if (KEY_PLACEHOLDER.test(text)) warn(`${label}: mentions a vendor API key placeholder (like YOUR_API_KEY). Callers use their Apify token.`);
    const longExamples = (text.match(/"(example|value)":\s*"(?:[^"\\]|\\.){2000,}"/g) ?? []).length;
    if (longExamples) warn(`${label}: ${longExamples} example(s) over 2,000 characters, usually vendor content pasted into the schema. Trim them.`);
    if (/\]\(\/[^)]/.test(text)) warn(`${label}: contains relative doc links like "](/docs/...)", which break on Apify. Run "npm run openapi -- --docs-base <docs-url>".`);
    const schemes = Object.keys(openapi.components?.securitySchemes ?? {});
    if (schemes.some((name) => name !== 'apifyToken')) warn(`${label}: security scheme(s) ${schemes.filter((n) => n !== 'apifyToken').join(', ')} look copied from the upstream API. Only the Apify token applies.`);
    if (openapi.servers?.length) warn(`${label}: "servers" is ignored (the platform replaces it with the Actor's URL). Remove it so the upstream host is not exposed.`);
}

// ---------------------------------------------------------------- .actor/input_schema.json
const inputSchema = await readJson('.actor/input_schema.json', { required: false });
const prefillPath = inputSchema?.properties?.path?.prefill;
if (config && prefillPath) {
    const { compileRoutes, matchRoute } = await import(pathToFileURL(join(root, 'src/pipeline.js')).href);
    const prefillMethod = inputSchema.properties.method?.prefill ?? inputSchema.properties.method?.default ?? 'GET';
    const found = matchRoute(compileRoutes(config.routes ?? []), prefillMethod, prefillPath);
    if (!found?.route) warn(`.actor/input_schema.json: the prefilled call ${prefillMethod} ${prefillPath} does not match any route.`);
}

// ---------------------------------------------------------------- README.md
try {
    const readme = await readFile(join(root, 'README.md'), 'utf8');
    if (TODO.test(readme.replace(URL_PLACEHOLDER, ''))) warn('README.md: still contains TODO placeholders.');
    if (URL_PLACEHOLDER.test(readme)) warn('README.md: the Actor URL is still a placeholder. Replace it after the first deploy (LAUNCH.md, go-live step 4).');
    for (const eventName of usedEvents) {
        const title = pricing?.events?.[eventName]?.title;
        if (title && !readme.includes(title)) warn(`README.md: does not mention the "${title}" event. Paste the table from "npm run pricing -- --readme".`);
    }
} catch {
    error('README.md: file is missing. It is the Actor\'s page in Apify Store.');
}

// ---------------------------------------------------------------- report
for (const message of errors) console.log(`ERROR    ${message}`);
for (const message of warnings) console.log(`warning  ${message}`);
console.log(`\n${routeKeys.size} routes, ${usedEvents.size} events: ${errors.length} errors, ${warnings.length} warnings.`);
process.exit(errors.length ? 1 : 0);
