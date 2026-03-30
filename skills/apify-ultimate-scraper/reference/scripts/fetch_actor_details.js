#!/usr/bin/env node
/**
 * Fetch Apify Actor details: README, input schema, and description.
 *
 * Usage:
 *   node --env-file=.env scripts/fetch_actor_details.js --actor "apify/instagram-profile-scraper"
 */

import { parseArgs } from 'node:util';

const USER_AGENT = 'apify-agent-skills/apify-ultimate-scraper-1.3.0';

function parseCliArgs() {
    const options = {
        actor: { type: 'string', short: 'a' },
        help: { type: 'boolean', short: 'h' },
    };

    const { values } = parseArgs({ options, allowPositionals: false });

    if (values.help) {
        console.log(`
Fetch Apify Actor details (README, input schema, description)

Usage:
  node --env-file=.env scripts/fetch_actor_details.js --actor "ACTOR_ID"

Options:
  --actor, -a    Actor ID (e.g., apify/instagram-profile-scraper) [required]
  --help, -h     Show this help message
`);
        process.exit(0);
    }

    if (!values.actor) {
        console.error('Error: --actor is required');
        process.exit(1);
    }

    return { actor: values.actor };
}

async function fetchActorInfo(token, actorId) {
    const apiActorId = actorId.replace('/', '~');
    const url = `https://api.apify.com/v2/acts/${apiActorId}?token=${encodeURIComponent(token)}`;

    const response = await fetch(url, {
        headers: { 'User-Agent': `${USER_AGENT}/fetch_actor_info` },
    });

    if (response.status === 404) {
        console.error(`Error: Actor '${actorId}' not found`);
        process.exit(1);
    }

    if (!response.ok) {
        const text = await response.text();
        console.error(`Error: Failed to fetch actor info (${response.status}): ${text}`);
        process.exit(1);
    }

    return (await response.json()).data;
}

async function fetchBuildDetails(token, actorId, buildId) {
    const apiActorId = actorId.replace('/', '~');
    const url = `https://api.apify.com/v2/acts/${apiActorId}/builds/${buildId}?token=${encodeURIComponent(token)}`;

    const response = await fetch(url, {
        headers: { 'User-Agent': `${USER_AGENT}/fetch_build` },
    });

    if (!response.ok) {
        return null;
    }

    return (await response.json()).data;
}

async function main() {
    const args = parseCliArgs();

    const token = process.env.APIFY_TOKEN;
    if (!token) {
        console.error('Error: APIFY_TOKEN not found in .env file');
        console.error('Add your token to .env: APIFY_TOKEN=your_token_here');
        console.error('Get your token: https://console.apify.com/account/integrations');
        process.exit(1);
    }

    // Step 1: Get actor info (includes readmeSummary, taggedBuilds)
    const actorInfo = await fetchActorInfo(token, args.actor);

    // Step 2: Get build details for input schema
    const buildId = actorInfo.taggedBuilds?.latest?.buildId;
    let inputSchema = null;

    if (buildId) {
        const build = await fetchBuildDetails(token, args.actor, buildId);
        if (build) {
            const schemaRaw = build.inputSchema;
            if (schemaRaw) {
                inputSchema = typeof schemaRaw === 'string' ? JSON.parse(schemaRaw) : schemaRaw;
            }
        }
    }

    // Compose output
    const stats = actorInfo.stats || {};
    const output = {
        actorId: args.actor,
        title: actorInfo.title || null,
        url: `https://apify.com/${args.actor}`,
        description: actorInfo.description || null,
        categories: actorInfo.categories || [],
        isDeprecated: actorInfo.isDeprecated || false,
        stats: {
            totalUsers: stats.totalUsers || 0,
            monthlyUsers: stats.totalUsers30Days || 0,
            bookmarks: stats.bookmarkCount || 0,
        },
        rating: {
            average: stats.actorReviewRating || null,
            count: stats.actorReviewCount || 0,
        },
        readmeSummary: actorInfo.readmeSummary || null,
        inputSchema: inputSchema || null,
    };

    console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
});
