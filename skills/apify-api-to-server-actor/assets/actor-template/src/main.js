/**
 * Entry point. Wires the Apify SDK to the generic wrapper code.
 *
 *   Server interface (a request to https://<user>--<actor>.apify.actor)  ->  start the HTTP server
 *   Input interface (Console "Start", API run, schedule, integration)    ->  make one call and exit
 *   Local run (`apify run`)                                              ->  start the HTTP server on port 4321
 *
 * You should not need to edit this file. The wrapper is defined in src/config.js.
 */
import { Actor, log } from 'apify';

import config from './config.js';
import { runInputMode } from './input-mode.js';
import { createLimits } from './limits.js';
import { createSigner } from './ownership.js';
import { createPipeline } from './pipeline.js';
import { createServer } from './server.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const atHome = Actor.isAtHome();
const startedByServerInterface = Actor.config.get('metaOrigin') === 'STANDBY';
const hasInputCall = typeof input.path === 'string' && input.path.trim() !== '';

// --- Upstream API key -----------------------------------------------------------------------
const apiKeyEnvVar = config.upstream.apiKeyEnvVar ?? 'UPSTREAM_API_KEY';
const apiKey = process.env[apiKeyEnvVar];
const needsKey = (config.upstream.auth?.type ?? 'none') !== 'none';
if (needsKey && !apiKey) {
    const message = `Environment variable ${apiKeyEnvVar} is not set. Add it as a secret environment variable of the Actor (see LAUNCH.md).`;
    if (atHome) await Actor.fail(message);
    log.warning(`${message} Until then, upstream calls will be rejected by the upstream API.`);
}

// --- Who is this run serving? ---------------------------------------------------------------
// A multi-tenant Server Actor run belongs to the Actor's owner and serves one pool of callers.
// Any other run belongs to the user who is calling.
let pool = null;
if (atHome && startedByServerInterface) {
    try {
        const run = await Actor.apifyClient.run(Actor.config.get('actorRunId')).get();
        pool = run?.standby?.deployment ?? null;
    } catch (err) {
        log.warning('Could not read the run details, the free-plan policy will not be applied.', { message: err.message });
    }
}
const isMultiTenant = pool?.startsWith('MULTI_TENANT') ?? false;
const callerIsFree = isMultiTenant
    ? pool === 'MULTI_TENANT_FREE_USERS'
    : atHome && process.env.APIFY_USER_IS_PAYING !== '1';
if (atHome && startedByServerInterface && pool && !isMultiTenant) {
    log.warning('This run serves one caller only (single-tenant): the caller pays platform usage on top of the events, '
        + 'and every caller starts their own runs. Once pay-per-event pricing is set up, switch to Settings > Server > Server tenancy > Multi-tenant.');
}

// --- Free-plan policy -----------------------------------------------------------------------
// The owner decides how to treat callers on the Apify free plan. src/config.js holds the default,
// and two environment variables override it, so the owner can change it without touching code:
//   FREE_USERS_POLICY                 allow | limit | block
//   FREE_USERS_MAX_REQUESTS_PER_DAY   paid calls per free caller per day, for "limit"
const freeUsers = { policy: 'allow', ...(config.limits?.freeUsers ?? {}) };
const policyOverride = process.env.FREE_USERS_POLICY?.trim().toLowerCase();
if (policyOverride) {
    if (['allow', 'limit', 'block'].includes(policyOverride)) freeUsers.policy = policyOverride;
    else log.warning(`FREE_USERS_POLICY "${policyOverride}" is not allow, limit or block. Using "${freeUsers.policy}" from src/config.js.`);
}
const maxOverride = process.env.FREE_USERS_MAX_REQUESTS_PER_DAY?.trim();
if (maxOverride) {
    const n = Number(maxOverride);
    if (Number.isInteger(n) && n >= 0) freeUsers.maxRequestsPerDay = n;
    else log.warning(`FREE_USERS_MAX_REQUESTS_PER_DAY "${maxOverride}" is not a whole number. Using ${freeUsers.maxRequestsPerDay ?? 'none'} from src/config.js.`);
}
const limits = { ...(config.limits ?? {}), freeUsers };

// --- Charging -------------------------------------------------------------------------------
// Actor.charge() does the right thing in every kind of run: with the request ID it bills the
// caller of a multi-tenant Server Actor, otherwise it bills the user who owns the run.
const chargingManager = Actor.getChargingManager();
const pricing = chargingManager.getPricingInfo();
const charging = {
    enabled: pricing.isPayPerEvent,
    remaining: (eventName) => chargingManager.calculateMaxEventChargeCountWithinLimit(eventName),
    charge: (options) => Actor.charge(options),
};

const usedEvents = [...new Set(config.routes.map((route) => route.event).filter(Boolean))];
if (!charging.enabled) {
    const message = 'Charging is OFF: this run is not pay-per-event, so every call is served for free.';
    if (atHome) log.warning(`${message} Set up pay-per-event monetization before you publish the Actor (see LAUNCH.md).`);
    else log.info(`${message} That is expected for a local run.`);
} else if (atHome) {
    // A typo in an event name would otherwise only show up as failed calls in production.
    const configured = Object.keys(pricing.perEventPrices ?? {});
    const missing = usedEvents.filter((eventName) => !configured.includes(eventName));
    if (missing.length) {
        log.error(`These events are used in src/config.js but are not in the Actor's pricing: ${missing.join(', ')}. `
            + 'Calls that charge them will fail until you add them in Apify Console > Publication > Monetization.');
    }
}

// --- Pipeline -------------------------------------------------------------------------------
const signer = createSigner({ secret: process.env.RESOURCE_ID_SECRET ?? apiKey });
const pipeline = createPipeline({
    config,
    apiKey,
    charging,
    limits: createLimits({ limits, callerIsFree }),
    signer,
    logger: log,
    pool,
    actorUrl: Actor.config.get('standbyUrl') ?? `http://localhost:${Number(process.env.ACTOR_WEB_SERVER_PORT) || 4321}`,
});

if (!startedByServerInterface && hasInputCall) {
    await runInputMode({ Actor, input, pipeline, logger: log });
    await Actor.exit();
}

if (atHome && !startedByServerInterface) {
    await Actor.fail('Nothing to do: set "path" in the input to call one endpoint, or send HTTP requests to the Actor\'s server URL instead.');
}

// --- Server ---------------------------------------------------------------------------------
const port = Number(process.env.ACTOR_WEB_SERVER_PORT) || Actor.config.get('containerPort');
const server = createServer({
    pipeline,
    config,
    logger: log,
    about: {
        name: process.env.ACTOR_FULL_NAME ?? 'local-run',
        url: Actor.config.get('standbyUrl') ?? `http://localhost:${port}`,
    },
});

// The platform only checks readiness once. A server that cannot listen must exit, not linger.
server.on('error', async (err) => {
    await Actor.fail(`HTTP server error: ${err.message}`);
});

server.listen(port, () => {
    log.info(`Listening on port ${port}.`, {
        endpoints: pipeline.routes.length,
        pool: pool ?? (atHome ? 'SINGLE_TENANT' : 'local'),
        charging: charging.enabled ? 'on' : 'off',
        freeUsers: freeUsers.policy === 'limit' ? `limit ${freeUsers.maxRequestsPerDay ?? 0}/day` : freeUsers.policy,
    });
});
