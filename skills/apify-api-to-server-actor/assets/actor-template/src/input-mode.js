/**
 * The input interface: one API call per run.
 *
 * It exists so the Actor also works where Actors are started with an input rather than
 * called over HTTP: the Console "Start" button, schedules, and integrations such as
 * Make, Zapier or n8n. It goes through the same pipeline, so it exposes the same
 * endpoints and charges the same events as the server interface.
 */
import { Buffer } from 'node:buffer';

import { HttpError } from './errors.js';

const TEXTUAL = /json|text|xml|csv|html|javascript|x-www-form-urlencoded/i;

export async function runInputMode({ Actor, input, pipeline, logger }) {
    const method = String(input.method ?? 'GET').toUpperCase();
    const url = new URL(input.path, 'http://localhost');
    for (const [key, value] of Object.entries(input.query ?? {})) {
        url.searchParams.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    }

    const sendsBody = input.body !== undefined && input.body !== null && !['GET', 'HEAD'].includes(method);
    const body = sendsBody ? Buffer.from(typeof input.body === 'string' ? input.body : JSON.stringify(input.body)) : null;
    const headers = { accept: 'application/json', ...(sendsBody ? { 'content-type': 'application/json' } : {}) };

    const chunks = [];
    let responseHeaders = {};
    const sink = {
        writeHead: (_status, h) => {
            responseHeaders = h;
        },
        write: (chunk) => {
            chunks.push(Buffer.from(chunk));
        },
        end: (chunk) => {
            if (chunk) chunks.push(Buffer.from(chunk));
        },
    };

    const item = { method, path: url.pathname, query: Object.fromEntries(url.searchParams) };
    try {
        const summary = await pipeline.execute({
            method,
            pathname: url.pathname,
            searchParams: url.searchParams,
            headers,
            body,
            userId: Actor.getEnv().userId ?? undefined,
        }, sink);
        Object.assign(item, { status: summary.status, charged: summary.charged ? Object.fromEntries(summary.charges.map((c) => [c.event, c.count])) : {} });

        const raw = Buffer.concat(chunks);
        const contentType = responseHeaders['content-type'] ?? 'application/octet-stream';
        if (TEXTUAL.test(contentType)) {
            const text = raw.toString('utf8');
            try {
                item.response = JSON.parse(text);
            } catch {
                item.response = text;
            }
        } else {
            // Binary results (images, audio, PDFs) do not belong in a dataset. Store the file and link to it.
            await Actor.setValue('RESPONSE', raw, { contentType });
            item.response = { storedAs: 'RESPONSE', contentType, bytes: raw.length };
        }
    } catch (err) {
        if (!(err instanceof HttpError)) throw err;
        // A rejected call is a result too. Report it instead of failing the run.
        Object.assign(item, { status: err.status, charged: {}, response: err.toJSON() });
    }

    await Actor.pushData(item);
    logger.info(`${method} ${url.pathname} ${item.status}`, { charged: item.charged });
    return item;
}
