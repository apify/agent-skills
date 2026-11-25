#!/usr/bin/env node
/**
 * Writes the Actor's web server schema (.actor/openapi.json) from the routes in src/config.js.
 *
 *     npm run openapi                                          skeleton operations only
 *     npm run openapi -- --upstream upstream/openapi.json      copy operations from the API's own OpenAPI file
 *     npm run openapi -- --upstream upstream/openapi.json --docs-base https://docs.example.com
 *
 * For every route it emits one OpenAPI operation under the path and method the Actor exposes:
 *
 *   - With --upstream, the operation (parameters, request body, responses and the schemas they
 *     reference) is copied from the upstream document, matched by the route's upstream method and path.
 *   - Without it, or for routes the upstream document does not cover, a skeleton marked TODO is written.
 *
 * What is removed from copied operations, because it is wrong for someone calling the Actor:
 *   - the upstream API's authentication (security, credential parameters such as api_key)
 *   - responses for the owner's key or account (401 and `upstream.ownerErrorStatuses`, the Actor answers 503 instead)
 *   - response headers the Actor does not pass on, and parameters the route does not forward
 *   - vendor extensions (x-codeSamples and other x-* fields), which hold the vendor's SDK snippets and key placeholders
 * Relative doc links ("](/docs/...)") are made absolute with --docs-base.
 *
 * Each operation's description gets its price, from pricing.json or the route's `priceNote`.
 * Anything in the route's `openapi` field is merged in last, so hand edits survive regeneration:
 * objects are merged, `null` deletes a key, `requestBody` replaces the copied one, and each entry of
 * `responses` replaces the copied response for that status code. The price note is added to the description even when the route overrides it.
 * Review the result: descriptions copied from the vendor may promise things the shared key changes
 * ("saved to your account", "counts against your plan"). Fix those through the route's `openapi` field.
 *
 * The upstream document must be OpenAPI 3.x JSON. Convert first if needed:
 *     YAML:         npx --yes js-yaml upstream.yaml > upstream/openapi.json
 *     Swagger 2.0:  npx --yes swagger2openapi upstream.json -o upstream/openapi.json
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
};
if (args.includes('--help')) {
    console.log('Usage: npm run openapi -- [--upstream <openapi.json>] [--docs-base <url>] [--out <file>]');
    process.exit(0);
}
const projectDir = resolve(flag('--project') ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const outFile = resolve(flag('--out') ?? join(projectDir, '.actor/openapi.json'));
const docsBase = flag('--docs-base')?.replace(/\/+$/, '');

const config = (await import(pathToFileURL(join(projectDir, 'src/config.js')).href)).default;
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const actor = await readJson(join(projectDir, '.actor/actor.json')).catch(() => ({}));
const pricing = await readJson(join(projectDir, 'pricing.json')).catch(() => ({ events: {} }));

let upstream = null;
if (flag('--upstream')) {
    const file = resolve(flag('--upstream'));
    if (/\.ya?ml$/i.test(file)) {
        console.error(`The upstream document must be JSON. Convert it first:\n    npx --yes js-yaml ${file} > upstream/openapi.json`);
        process.exit(1);
    }
    upstream = await readJson(file);
    if (upstream.swagger) {
        console.error(`${file} is Swagger 2.0. Convert it first:\n    npx --yes swagger2openapi ${file} -o upstream/openapi.json`);
        process.exit(1);
    }
    if (!/^3\./.test(upstream.openapi ?? '')) {
        console.error(`${file} is not an OpenAPI 3.x document.`);
        process.exit(1);
    }
}

const PARAM = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const CREDENTIAL_QUERY_PARAMS = ['token', 'api_key', 'apikey', 'api-key', 'access_token', 'auth_token'];
const RETURNED_HEADERS = ['content-type', 'content-disposition', 'content-language', 'cache-control', 'etag', 'last-modified', 'location', 'retry-after', 'x-charged-event', 'x-charged-count'];
const shape = (path) => (path.length > 1 ? path.replace(/\/+$/, '') : path).replace(PARAM, '{}');
const usd = (value) => `$${value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}`;
const auth = config.upstream?.auth ?? { type: 'none' };
const ownerErrors = new Set([401, ...(config.upstream?.ownerErrorStatuses ?? [401, 402])].map(String));
const droppedQuery = new Set([...CREDENTIAL_QUERY_PARAMS, ...(config.upstream?.dropQuery ?? []), ...(auth.type === 'query' ? [auth.name] : [])].map((n) => n.toLowerCase()));
const events = (route) => (route.event == null ? [] : [route.event].flat());

/** Some upstream documents carry the API prefix in servers[].url instead of in the paths. */
const serverPrefixes = [''];
for (const server of upstream?.servers ?? []) {
    try {
        const prefix = new URL(server.url, 'https://placeholder.invalid').pathname.replace(/\/+$/, '');
        if (prefix && !serverPrefixes.includes(prefix)) serverPrefixes.push(prefix);
    } catch { /* templated server URL, ignore */ }
}

function findUpstreamOperation(route) {
    if (!upstream) return null;
    const method = (route.upstreamMethod ?? route.method).toLowerCase();
    const wanted = shape(route.upstreamPath ?? route.path);
    for (const [path, item] of Object.entries(upstream.paths ?? {})) {
        if (!item[method]) continue;
        if (serverPrefixes.some((prefix) => shape(prefix + path) === wanted)) return { operation: item[method], shared: item.parameters ?? [] };
    }
    return null;
}

const resolveRef = (node) => {
    if (!node?.$ref?.startsWith('#/')) return node;
    return node.$ref.slice(2).split('/').reduce((value, key) => value?.[key.replace(/~1/g, '/').replace(/~0/g, '~')], upstream);
};

/** Removes vendor extensions everywhere except inside schema property maps, where x- is just a name. */
function stripExtensions(node, parentKey = '') {
    if (Array.isArray(node)) return node.map((item) => stripExtensions(item));
    if (!node || typeof node !== 'object') return node;
    const out = {};
    for (const [key, value] of Object.entries(node)) {
        if (key.startsWith('x-') && parentKey !== 'properties') continue;
        out[key] = stripExtensions(value, key);
    }
    return out;
}

/** Drops example values longer than 2,000 characters: they are usually vendor content (docs pages, plan text). */
const MAX_EXAMPLE_CHARS = 2000;
let trimmedExamples = 0;
function trimExamples(node, parentKey = '') {
    if (Array.isArray(node)) return node.map((item) => trimExamples(item));
    if (!node || typeof node !== 'object') return node;
    const out = {};
    for (const [key, value] of Object.entries(node)) {
        const isExample = (key === 'example' || key === 'value') && parentKey !== 'properties';
        if (isExample && JSON.stringify(value ?? '').length > MAX_EXAMPLE_CHARS) {
            trimmedExamples += 1;
            continue;
        }
        out[key] = trimExamples(value, key);
    }
    return out;
}

let relativeLinks = 0;
function absolutizeLinks(node) {
    if (typeof node === 'string') {
        return node.replace(/\]\((\/[^)\s]*)\)/g, (match, link) => {
            if (docsBase) return `](${docsBase}${link})`;
            relativeLinks += 1;
            return match;
        });
    }
    if (Array.isArray(node)) return node.map(absolutizeLinks);
    if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, absolutizeLinks(v)]));
    return node;
}

function mergeDeep(target, source) {
    for (const [key, value] of Object.entries(source ?? {})) {
        if (value === null) {
            delete target[key];
            continue;
        }
        if (value && typeof value === 'object' && !Array.isArray(value) && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
            mergeDeep(target[key], value);
        } else {
            target[key] = value;
        }
    }
    return target;
}

function isDroppedParameter(route, parameter) {
    const p = parameter ?? {};
    const name = String(p.name ?? '').toLowerCase();
    if (p.in === 'path') return true; // rebuilt from the Actor's path below
    if (p.in === 'header') {
        if (['authorization', 'x-api-key', 'api-key', 'apikey'].includes(name)) return true;
        if (auth.type === 'header' && name === String(auth.name).toLowerCase()) return true;
        return !(route.forwardHeaders ?? []).map((h) => h.toLowerCase()).includes(name);
    }
    if (p.in === 'query') {
        if (droppedQuery.has(name)) return true;
        if (route.allowQuery && !route.allowQuery.includes(p.name)) return true;
        if (route.upstreamQuery && p.name in route.upstreamQuery) return true;
    }
    if (p.in === 'cookie') return true;
    return false;
}

function priceNote(route) {
    if (route.priceNote) return `Price: ${route.priceNote}`;
    const list = events(route);
    if (list.length === 0) return 'Price: free.';
    const parts = list.map((name) => {
        const event = pricing.events?.[name];
        if (!event) return `event \`${name}\``;
        const price = event.priceUsd ?? event.tieredPriceUsd?.BRONZE;
        return `${usd(price)} per ${event.title.toLowerCase()} (event \`${name}\`${event.tieredPriceUsd ? ', lower on higher Apify plans' : ''})`;
    });
    const fixed = typeof route.count !== 'function' && !Array.isArray(route.event);
    const per = fixed && (route.count ?? 1) === 1 ? 'per call' : 'charged by usage';
    const when = route.chargeOn === 'always' ? '' : ' Charged only when the call succeeds.';
    return `Price: ${parts.join(' and ')}, ${per}.${when}`;
}

const paths = {};
const skeletons = [];
const operationIds = new Set();

for (const route of config.routes) {
    const method = route.method.toLowerCase();
    const actorParams = [...route.path.matchAll(PARAM)].map((m) => m[1]);
    const found = findUpstreamOperation(route);
    let operation;

    if (found) {
        operation = structuredClone(found.operation);
        delete operation.security;
        delete operation.servers;
        delete operation.callbacks;
        const upstreamParamNames = [...(route.upstreamPath ?? route.path).matchAll(PARAM)].map((m) => m[1]);
        const allParams = [...found.shared, ...(operation.parameters ?? [])].map((p) => structuredClone(resolveRef(p)));
        const upstreamPathParams = allParams.filter((p) => p?.in === 'path');
        // Path parameters follow the Actor's path, which may name or order them differently than upstream.
        const pathParameters = actorParams.map((name, i) => {
            const original = upstreamPathParams.find((p) => p.name === name) ?? upstreamPathParams.find((p) => p.name === upstreamParamNames[i]);
            const parameter = { ...(original ?? { schema: { type: 'string' } }), name, in: 'path', required: true };
            if ((route.ownedParams ?? []).includes(name)) {
                // The Actor hands out signed IDs, so the upstream format (uuid, integer) no longer applies.
                parameter.schema = { type: 'string' };
                parameter.description = 'The ID this Actor returned when the resource was created. IDs are bound to your Apify account.';
                delete parameter.example;
                delete parameter.examples;
            }
            return parameter;
        });
        const kept = allParams.filter((p) => p && !isDroppedParameter(route, p));
        for (const name of route.allowQuery ?? []) {
            if (!kept.some((p) => p.in === 'query' && p.name === name)) kept.push({ name, in: 'query', required: false, schema: { type: 'string' } });
        }
        operation.parameters = [...pathParameters, ...kept];
        if (operation.parameters.length === 0) delete operation.parameters;

        for (const code of Object.keys(operation.responses ?? {})) {
            if (ownerErrors.has(code)) {
                delete operation.responses[code];
                continue;
            }
            const response = resolveRef(operation.responses[code]);
            if (response?.headers) {
                const kept = Object.fromEntries(Object.entries(response.headers).filter(([name]) => RETURNED_HEADERS.includes(name.toLowerCase())));
                operation.responses[code] = { ...response, headers: kept };
                if (Object.keys(kept).length === 0) delete operation.responses[code].headers;
            }
        }
    } else {
        if (!route.openapi) skeletons.push(`${route.method} ${route.path}`);
        operation = {
            parameters: actorParams.map((name) => ({ name, in: 'path', required: true, schema: { type: 'string' } })),
            ...(['post', 'put', 'patch'].includes(method)
                ? { requestBody: { description: 'TODO describe the request body.', content: { 'application/json': { schema: { type: 'object' } } } } }
                : {}),
            responses: { 200: { description: 'TODO describe the response.' } },
        };
        if (operation.parameters.length === 0) delete operation.parameters;
    }

    operation = absolutizeLinks(trimExamples(stripExtensions(operation)));
    operation.summary = route.summary ?? operation.summary ?? `${route.method} ${route.path}`;
    operation.description = [operation.description, priceNote(route)].filter(Boolean).join('\n\n');
    operation.responses ??= {};
    if (Object.keys(operation.responses).length === 0) operation.responses['200'] = { description: 'Successful response.' };
    operation.responses['503'] ??= { description: 'The service is temporarily unavailable. Not charged.' };

    let operationId = operation.operationId ?? `${method}${route.path.replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => (c ?? '').toUpperCase())}`;
    while (operationIds.has(operationId)) operationId += '_';
    operationIds.add(operationId);
    operation.operationId = operationId;
    const { responses: responseOverrides, requestBody: requestBodyOverride, ...override } = route.openapi ?? {};
    // A request body override replaces the copied one, so rejected options do not stay documented.
    if (requestBodyOverride === null) delete operation.requestBody;
    else if (requestBodyOverride !== undefined) operation.requestBody = requestBodyOverride;
    for (const [code, response] of Object.entries(responseOverrides ?? {})) {
        if (response === null) delete operation.responses[code];
        else operation.responses[code] = response;
    }
    mergeDeep(operation, override);
    // A hand-written description must not lose the price.
    if (!/Price:/.test(operation.description ?? '')) operation.description = [operation.description, priceNote(route)].filter(Boolean).join('\n\n');

    paths[route.path] ??= {};
    paths[route.path][method] = operation;
}

// The Actor answers GET / with its endpoint list (src/server.js), unless a route takes that path.
if (!paths['/']?.get) {
    paths['/'] = {
        ...(paths['/'] ?? {}),
        get: {
            operationId: 'listEndpoints',
            summary: 'List the endpoints of this API, with the event each one charges.',
            description: 'Price: free.',
            responses: { 200: { description: 'The endpoint list as JSON.' } },
        },
    };
}

/** Copy only the components the kept operations reference, following references transitively. */
const components = {};
const usedRefs = new Set();
function collect(node) {
    if (Array.isArray(node)) return node.forEach(collect);
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
        if (key === '$ref' && typeof value === 'string' && value.startsWith('#/components/') && !usedRefs.has(value)) {
            usedRefs.add(value);
            const [, , section, name] = value.split('/');
            const target = upstream?.components?.[section]?.[name];
            if (target !== undefined) {
                components[section] ??= {};
                components[section][name] = absolutizeLinks(trimExamples(stripExtensions(target)));
                collect(target);
            }
        } else {
            collect(value);
        }
    }
}
collect(paths);
delete components.securitySchemes;

const placeholder = (text) => !text || /TODO/.test(text);
const document = {
    openapi: upstream?.openapi ?? '3.0.3',
    info: {
        title: placeholder(actor.title) ? (upstream?.info?.title ?? 'TODO API title') : actor.title,
        version: upstream?.info?.version ?? '1.0.0',
        description: [
            placeholder(actor.description) ? undefined : actor.description,
            'Authenticate with your Apify API token. Each endpoint lists its price. `GET /` returns the endpoint list as JSON.',
        ].filter(Boolean).join('\n\n'),
    },
    security: [{ apifyToken: [] }],
    paths,
    components: {
        ...components,
        securitySchemes: {
            apifyToken: {
                type: 'http',
                scheme: 'bearer',
                description: 'Your Apify API token, from Apify Console > Settings > API & Integrations.',
            },
        },
    },
};

await writeFile(outFile, `${JSON.stringify(document, null, 4)}\n`);
const copied = config.routes.filter((route) => findUpstreamOperation(route)).length;
console.log(`Wrote ${outFile}: ${config.routes.length} operations, ${copied} copied from the upstream document.`);
if (skeletons.length) {
    console.log('Complete these through each route\'s `openapi` field (parameters, requestBody, responses), then run this again:');
    for (const name of skeletons) console.log(`  ${name}`);
}
if (trimmedExamples) console.log(`${trimmedExamples} vendor examples longer than ${MAX_EXAMPLE_CHARS} characters were left out. Add short ones through the route's \`openapi\` field if they help.`);
if (relativeLinks) console.log(`${relativeLinks} relative doc links like "](/docs/...)" were left as they are. Pass --docs-base <url> to make them absolute.`);
console.log('Review the copied descriptions for anything that is not true through the Actor (account, plan, saved data), and fix it in the route\'s `openapi` field.');
