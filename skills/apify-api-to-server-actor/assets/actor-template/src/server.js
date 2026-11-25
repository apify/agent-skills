/**
 * The server interface: a plain Node.js HTTP server in front of the pipeline.
 * The Apify platform authenticates callers and proxies their requests here.
 */
import { once } from 'node:events';
import http from 'node:http';

import { HttpError } from './errors.js';

const READINESS_PROBE_HEADER = 'x-apify-container-server-readiness-probe';

function sendJson(res, status, payload, headers = {}) {
    if (res.headersSent) {
        res.destroy();
        return;
    }
    const body = Buffer.from(JSON.stringify(payload));
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': String(body.length), ...headers });
    res.end(body);
}

async function readBody(req, maxBytes) {
    if (req.method === 'GET' || req.method === 'HEAD') return null;
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > maxBytes) throw new HttpError(413, 'request-too-large', `Request body exceeds ${maxBytes} bytes.`);
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

/**
 * @param {object} options
 * @param {object} options.pipeline  from createPipeline()
 * @param {object} options.config    src/config.js
 * @param {object} options.logger    { info, warning, error }
 * @param {object} [options.about]   { name, title, description, url } shown by GET /
 */
export function createServer({ pipeline, config, logger, about = {} }) {
    const maxBodyBytes = config.limits?.maxRequestBodyBytes ?? 10 * 1024 * 1024;
    const hasRootRoute = pipeline.routes.some((route) => route.path === '/' && route.method === 'GET');

    const index = () => ({
        ...about,
        authentication: 'Send your Apify API token as "Authorization: Bearer <token>".',
        pricing: 'Pay per event. See the Pricing tab of this Actor in Apify Store. Free endpoints have "event": null.',
        endpoints: pipeline.routes.map((route) => ({
            method: route.method,
            path: route.path,
            summary: route.summary,
            event: route.event ?? null,
        })),
    });

    async function handle(req, res) {
        // The platform checks readiness once, with this header, before it sends any traffic. Always answer it.
        if (req.headers[READINESS_PROBE_HEADER]) {
            res.writeHead(200, { 'content-type': 'text/plain' });
            res.end('ok');
            return;
        }

        const url = new URL(req.url, 'http://localhost');
        if (req.method === 'GET' && url.pathname === '/' && !hasRootRoute) {
            sendJson(res, 200, index());
            return;
        }

        const started = Date.now();
        const userId = req.headers['x-apify-user-id'];
        const abort = new AbortController();
        res.on('close', () => {
            if (!res.writableEnded) abort.abort();
        });

        const sink = {
            writeHead: (status, headers) => res.writeHead(status, headers),
            write: async (chunk) => {
                if (!res.write(chunk)) await once(res, 'drain');
            },
            end: (chunk) => res.end(chunk),
            destroy: () => res.destroy(),
        };

        let line = { status: 500 };
        try {
            const body = await readBody(req, maxBodyBytes);
            const summary = await pipeline.execute({
                method: req.method,
                pathname: url.pathname,
                searchParams: url.searchParams,
                headers: req.headers,
                body,
                userId,
                // Identifies this request to the platform. Charges must carry it so the right user pays.
                requestId: req.headers['x-actor-request-id'],
                signal: abort.signal,
            }, sink);
            line = { status: summary.status, charges: summary.charges, charged: summary.charged };
        } catch (err) {
            if (err instanceof HttpError) {
                line = { status: err.status, error: err.type };
                sendJson(res, err.status, err.toJSON(), err.headers);
            } else {
                logger.error(`${req.method} ${url.pathname}: unexpected error.`, { message: err.message, stack: err.stack });
                sendJson(res, 500, { error: { type: 'internal-error', message: 'Unexpected error. You were not charged.' } });
            }
        }
        logger.info(`${req.method} ${url.pathname} ${line.status}`, { ...line, userId, ms: Date.now() - started });
    }

    const server = http.createServer((req, res) => {
        handle(req, res).catch((err) => {
            logger.error('Request handler crashed.', { message: err.message });
            res.destroy();
        });
    });
    // Longer than a proxy's idle timeout, so the proxy never reuses a connection we already closed.
    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;
    return server;
}
