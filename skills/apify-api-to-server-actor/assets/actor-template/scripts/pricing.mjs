#!/usr/bin/env node
/**
 * Turns pricing.json into everything needed to price the Actor:
 *
 *     npm run pricing               economics of every event: what users pay, what you keep
 *     npm run pricing -- --readme   Markdown pricing table for README.md
 *     npm run pricing -- --console  what to type into Apify Console > Publication > Monetization
 *     npm run pricing -- --api      request body for PUT /v2/actors/{actorId} (see the note it prints)
 *
 * How the money flows on Apify (https://docs.apify.com/actors/monetize/pricing-and-costs):
 *
 *     your payout = 80% of event revenue from users on paid Apify plans
 *                   - platform usage of the runs that served them
 *
 * Users on the free Apify plan pay for events out of their free credit, but that revenue
 * does not reach your payout. Apify covers the platform usage of the runs that serve them.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pricing = JSON.parse(await readFile(join(root, 'pricing.json'), 'utf8'));
const mode = process.argv.slice(2).find((arg) => arg.startsWith('--')) ?? '--economics';

/** Share of event revenue that goes to the Actor's owner. */
const OWNER_SHARE = 0.8;
/** Platform usage unit prices, FREE and BRONZE tier. They are lower on SILVER and GOLD. Checked 2026-11. */
const USD_PER_COMPUTE_UNIT = 0.2; // 1 compute unit = 1 GB of memory for 1 hour
const USD_PER_GB_TRANSFER = 0.2;
const TIERS = ['FREE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];

const events = Object.entries(pricing.events ?? {});
if (events.length === 0) {
    console.error('pricing.json has no events.');
    process.exit(1);
}

const usd = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
    // Up to 6 decimals, no trailing zeros: $0.01225 stays $0.01225, $0.004 stays $0.004.
    const rounded = Math.round(value * 1e6 + Number.EPSILON * 1e6) / 1e6;
    return `$${rounded.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}`;
};
const per1000 = (value) => `$${(value * 1000).toFixed(2)}`;
const pct = (value) => `${(value * 100).toFixed(0)}%`;
/** The price a paying user sees. With tiers, BRONZE is the entry paid tier. */
const paidPrice = (event) => event.priceUsd ?? event.tieredPriceUsd?.BRONZE;
const tierList = (event) => TIERS.filter((tier) => event.tieredPriceUsd?.[tier] !== undefined);

// Rough platform cost of serving one request. The run is billed for its memory while it is alive,
// whether or not it is busy, so idle time is spread over the requests via `utilization`.
const a = { memoryMbytes: 256, avgRequestSecs: 1.5, avgResponseKb: 20, utilization: 0.3, ...(pricing.assumptions ?? {}) };
const computePerRequest = ((a.memoryMbytes / 1024) * (a.avgRequestSecs / 3600) * USD_PER_COMPUTE_UNIT) / a.utilization;
const transferPerRequest = (a.avgResponseKb / 1024 / 1024) * USD_PER_GB_TRANSFER;
const platformPerRequest = computePerRequest + transferPerRequest;

if (mode === '--readme') {
    const tiered = events.some(([, event]) => event.tieredPriceUsd);
    const tiers = tiered ? TIERS.filter((tier) => events.some(([, event]) => event.tieredPriceUsd?.[tier] !== undefined)) : [];
    const head = tiered ? ['Event', 'What you pay for', ...tiers.map((t) => t[0] + t.slice(1).toLowerCase())] : ['Event', 'What you pay for', 'Price', 'Per 1,000'];
    console.log(`| ${head.join(' | ')} |`);
    console.log(`| ${head.map(() => '---').join(' | ')} |`);
    for (const [, event] of events) {
        const cells = tiered
            ? tiers.map((tier) => usd(event.tieredPriceUsd?.[tier] ?? event.priceUsd))
            : [usd(event.priceUsd), per1000(event.priceUsd)];
        console.log(`| ${event.title} | ${event.description} | ${cells.join(' | ')} |`);
    }
    process.exit(0);
}

if (mode === '--console') {
    console.log('Apify Console > your Actor > Publication > Monetization > Set up monetization\n');
    console.log('1. Pricing model: Pay per event.');
    console.log('2. Leave "apify-actor-start" at its default price. It only applies to runs started with the input form.');
    console.log('3. Delete "apify-default-dataset-item". This Actor charges its own events, the dataset event would bill input-form runs twice.');
    console.log('4. Add these custom events. The event name must match exactly, the code charges by name:\n');
    for (const [name, event] of events) {
        console.log(`   Event name:   ${name}`);
        console.log(`   Title:        ${event.title}`);
        console.log(`   Description:  ${event.description}`);
        if (event.tieredPriceUsd) {
            console.log(`   Price:        ${tierList(event).map((tier) => `${tier} ${usd(event.tieredPriceUsd[tier])}`).join(', ')}`);
        } else {
            console.log(`   Price:        ${usd(event.priceUsd)}  (same for all tiers)`);
        }
        console.log('');
    }
    const primary = events.find(([, event]) => event.primary);
    console.log(`5. Primary event: ${primary ? `${primary[0]} ("${primary[1].title}")` : 'pick the event that best represents the Actor'}.`);
    console.log('6. Keep "Pay per event + usage" off, so users pay events only.');
    console.log('\nThen: Settings > Server > Server tenancy > Multi-tenant. See LAUNCH.md for the order of steps.');
    process.exit(0);
}

if (mode === '--api') {
    const actorChargeEvents = {};
    for (const [name, event] of events) {
        actorChargeEvents[name] = {
            eventTitle: event.title,
            eventDescription: event.description,
            ...(event.tieredPriceUsd
                ? { eventTieredPricingUsd: Object.fromEntries(tierList(event).map((tier) => [tier, { tieredEventPriceUsd: event.tieredPriceUsd[tier] }])) }
                : { eventPriceUsd: event.priceUsd }),
            ...(event.primary ? { isPrimaryEvent: true } : {}),
        };
    }
    console.error([
        'Request body for PUT https://api.apify.com/v2/actors/{actorId}, following the public OpenAPI schema.',
        'Apify Console is the documented way to set pricing ("npm run pricing -- --console"). If you automate it',
        'through the API instead: read the Actor first and keep its existing pricingInfos records in the array,',
        'add one new record at a time, and expect the same rules as in Console (a price increase on an Actor',
        'with paying users takes effect after 14 days, and only one such change per month is allowed).',
        '',
    ].join('\n'));
    console.log(JSON.stringify({ pricingInfos: [{ pricingModel: 'PAY_PER_EVENT', pricingPerEvent: { actorChargeEvents } }] }, null, 2));
    process.exit(0);
}

// ------------------------------------------------------------------ economics (default)
const { upstream = {} } = pricing;
console.log(`\n${upstream.product ?? 'Upstream API'} on Apify: pricing check`);
if (upstream.basis) console.log(`Direct price basis: ${upstream.basis}`);
if (upstream.pricingUrl) console.log(`Source: ${upstream.pricingUrl}${upstream.retrievedOn ? ` (read ${upstream.retrievedOn})` : ''}`);

const rows = events.map(([name, event]) => {
    const price = paidPrice(event);
    const direct = event.upstreamPriceUsd;
    const net = price * OWNER_SHARE;
    return {
        Event: name + (event.primary ? ' *' : ''),
        'Direct price': usd(direct),
        'Apify price': usd(price) + (event.tieredPriceUsd ? ' (Bronze)' : ''),
        'vs direct': typeof direct === 'number' && direct > 0 ? `${price >= direct ? '+' : ''}${pct(price / direct - 1)}` : 'n/a',
        'You keep (80%)': usd(net),
        'Keep vs direct': typeof direct === 'number' && direct > 0 ? pct(net / direct) : 'n/a',
        'Price to net the direct price': typeof direct === 'number' ? usd(direct / OWNER_SHARE) : 'n/a',
    };
});
const columns = Object.keys(rows[0]);
const width = (column) => Math.max(column.length, ...rows.map((row) => String(row[column]).length));
console.log(`\n${columns.map((c) => c.padEnd(width(c))).join('  ')}`);
console.log(columns.map((c) => '-'.repeat(width(c))).join('  '));
for (const row of rows) console.log(columns.map((c) => String(row[c]).padEnd(width(c))).join('  '));
console.log('* primary event\n');

console.log(`Estimated platform usage per request: ${usd(platformPerRequest)} (${per1000(platformPerRequest)} per 1,000)`);
console.log(`  from ${a.memoryMbytes} MB memory, ${a.avgRequestSecs} s per request, ${a.avgResponseKb} KB per response, runs busy ${pct(a.utilization)} of the time.`);
console.log('  It comes out of your payout for paying users. Replace the estimate with real numbers from Actor analytics after launch.');

// Revenue per request of the cheapest event, using `avgCountPerCall` when one call usually charges it several times.
const cheapest = Math.min(...events.map(([, event]) => paidPrice(event) * (event.avgCountPerCall ?? 1)));
const share = platformPerRequest / (cheapest * OWNER_SHARE);
if (share > 0.25) {
    console.log(`\nWARNING: platform usage is about ${pct(share)} of what you keep on the cheapest call (${usd(cheapest)} of events).`);
    console.log('         Raise the price, lower memory, or charge a bigger unit. If one call usually charges an event several');
    console.log('         times (pages, results), set "avgCountPerCall" on that event in pricing.json for a fair estimate.');
}
const belowDirect = rows.filter((row) => row['vs direct'].startsWith('-'));
if (belowDirect.length) console.log(`\nNote: ${belowDirect.map((row) => row.Event.replace(' *', '')).join(', ')} cost less on Apify than direct. Make sure that is intended.`);

console.log(`\nStrategy in pricing.json: ${pricing.strategy ?? 'not set'}`);
console.log('  parity     Apify price = direct price. Simple to explain. Apify\'s 20% is your cost of distribution.');
console.log('  gross-up   Apify price = direct price / 0.8. You net the same as on a direct sale, users pay 25% more.');
console.log('\nNext: "npm run pricing -- --readme" for the README table, "-- --console" for the Console setup.\n');
