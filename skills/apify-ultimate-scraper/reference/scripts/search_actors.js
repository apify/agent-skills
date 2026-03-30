#!/usr/bin/env node
/**
 * Search Apify Store for Actors matching keywords.
 *
 * Usage:
 *   node --env-file=.env scripts/search_actors.js --query "instagram"
 *   node --env-file=.env scripts/search_actors.js --query "amazon products" --limit 5
 */

import { parseArgs } from 'node:util';

const USER_AGENT = 'apify-agent-skills/apify-ultimate-scraper-1.3.0';

function parseCliArgs() {
    const options = {
        query: { type: 'string', short: 'q' },
        limit: { type: 'string', short: 'l', default: '10' },
        help: { type: 'boolean', short: 'h' },
    };

    const { values } = parseArgs({ options, allowPositionals: false });

    if (values.help) {
        console.log(`
Search Apify Store for Actors

Usage:
  node --env-file=.env scripts/search_actors.js --query "KEYWORDS"

Options:
  --query, -q    Search keywords (e.g., "instagram", "amazon products") [required]
  --limit, -l    Max results to return (default: 10)
  --help, -h     Show this help message
`);
        process.exit(0);
    }

    if (!values.query) {
        console.error('Error: --query is required');
        process.exit(1);
    }

    return {
        query: values.query,
        limit: parseInt(values.limit, 10) || 10,
    };
}

async function searchStore(query, limit) {
    const params = new URLSearchParams({ search: query, limit: String(limit) });
    const url = `https://api.apify.com/v2/store?${params}`;

    const response = await fetch(url, {
        headers: { 'User-Agent': `${USER_AGENT}/search_actors` },
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`Error: Store search failed (${response.status}): ${text}`);
        process.exit(1);
    }

    const result = await response.json();
    return result.data?.items || [];
}

function formatResults(actors) {
    if (actors.length === 0) {
        console.log('No actors found.');
        return;
    }

    console.log(`Found ${actors.length} actor(s):\n`);

    for (const actor of actors) {
        const id = `${actor.username}/${actor.name}`;
        const title = actor.title || id;
        const desc = actor.description
            ? actor.description.length > 120
                ? actor.description.slice(0, 120) + '...'
                : actor.description
            : 'No description';
        const runs = actor.stats?.totalRuns?.toLocaleString() || '0';
        const users = actor.stats?.totalUsers?.toLocaleString() || '0';

        console.log(`  ${id}`);
        console.log(`    Title: ${title}`);
        console.log(`    ${desc}`);
        console.log(`    Runs: ${runs} | Users: ${users}`);
        console.log();
    }
}

async function main() {
    const args = parseCliArgs();
    const actors = await searchStore(args.query, args.limit);
    formatResults(actors);
}

main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
});
