/**
 * Caller-bound resource IDs.
 *
 * All callers share one upstream API key, so the upstream API cannot tell them apart.
 * If an endpoint creates something that is fetched later (an async job, an upload, a batch),
 * any caller who guesses or sees its ID could read another caller's result.
 *
 * The fix needs no database: the Actor hands out `<upstreamId>.<signature>`, where the
 * signature covers the caller's Apify user ID. On the way back in, a route that lists the
 * path parameter in `ownedParams` accepts the ID only if the signature matches the caller.
 *
 * Issue the ID in the route that creates the resource:
 *
 *     transformResponse: (ctx) => {
 *         const body = ctx.upstream.json();
 *         if (body?.id) ctx.upstream.body = { ...body, id: ctx.signId(body.id) };
 *     },
 *
 * and require it in the routes that read it:
 *
 *     { method: 'GET', path: '/v1/jobs/{jobId}', ownedParams: ['jobId'], event: null }
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * @param {object} options
 * @param {string} [options.secret]  Stable secret. The same value must be used by every run,
 *                                   which is why it is derived from the upstream API key by default.
 */
export function createSigner({ secret } = {}) {
    const key = secret
        ? createHash('sha256').update(`resource-ids:${secret}`).digest()
        // No stable secret (public upstream API, no key): IDs stop working when the run is replaced.
        : randomBytes(32);

    const signature = (userId, id) => createHmac('sha256', key).update(`${userId ?? ''}\n${id}`).digest('base64url').slice(0, 22);

    return {
        isStable: Boolean(secret),

        sign(userId, id) {
            return `${id}.${signature(userId, String(id))}`;
        },

        /** @returns {string|null} the upstream ID, or null if the ID was not issued to this caller */
        verify(userId, signed) {
            const cut = typeof signed === 'string' ? signed.lastIndexOf('.') : -1;
            if (cut <= 0) return null;
            const id = signed.slice(0, cut);
            const given = Buffer.from(signed.slice(cut + 1));
            const expected = Buffer.from(signature(userId, id));
            if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
            return id;
        },
    };
}
