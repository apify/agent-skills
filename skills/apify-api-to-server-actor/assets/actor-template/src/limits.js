/**
 * Guard rails between Apify users and the single upstream API key.
 *
 * All counters live in the memory of one run. The platform runs several runs side by side
 * and replaces them over time, so treat these as protection against runaway callers,
 * not as exact quotas.
 */
import { HttpError } from './errors.js';

const MAX_TRACKED_USERS = 20_000;

/**
 * @param {object} options
 * @param {object} [options.limits]         config.limits
 * @param {boolean} [options.callerIsFree]  true when this run serves callers on the Apify free plan
 * @param {() => number} [options.now]
 */
export function createLimits({ limits = {}, callerIsFree = false, now = Date.now } = {}) {
    const perMinute = limits.perUserRequestsPerMinute ?? 0;
    const maxConcurrent = limits.perUserConcurrency ?? 0;
    const free = limits.freeUsers ?? { policy: 'allow' };
    const totalPerMinute = limits.totalRequestsPerMinute ?? 0;
    const total = { tokens: totalPerMinute, refilledAt: now() };
    const users = new Map();

    function stateOf(userId) {
        const key = userId ?? 'anonymous';
        let state = users.get(key);
        if (!state) {
            if (users.size >= MAX_TRACKED_USERS) {
                for (const [id, s] of users) if (s.active === 0) users.delete(id);
            }
            state = { tokens: perMinute, refilledAt: now(), active: 0, day: '', dayCount: 0 };
            users.set(key, state);
        }
        return state;
    }

    /**
     * Admits one call or throws an HttpError. Only paid calls count against the free-plan daily allowance.
     * @returns {() => void} call it when the request is finished
     */
    function acquire(userId, { paid = true } = {}) {
        const state = stateOf(userId);

        if (callerIsFree && free.policy === 'block') {
            throw new HttpError(403, 'paid-plan-required', 'This API is available on paid Apify plans. Upgrade at https://apify.com/pricing to use it.');
        }

        if (totalPerMinute > 0) {
            const t = now();
            total.tokens = Math.min(totalPerMinute, total.tokens + ((t - total.refilledAt) / 60_000) * totalPerMinute);
            total.refilledAt = t;
            if (total.tokens < 1) {
                throw new HttpError(429, 'service-busy', 'The service is busy. Retry in a few seconds.', { 'retry-after': '2' });
            }
        }
        if (perMinute > 0) {
            const t = now();
            state.tokens = Math.min(perMinute, state.tokens + ((t - state.refilledAt) / 60_000) * perMinute);
            state.refilledAt = t;
            if (state.tokens < 1) {
                const retryAfter = Math.max(1, Math.ceil(((1 - state.tokens) / perMinute) * 60));
                throw new HttpError(429, 'rate-limit-exceeded', `Limit of ${perMinute} requests per minute reached. Retry in ${retryAfter} s.`, { 'retry-after': String(retryAfter) });
            }
        }
        if (maxConcurrent > 0 && state.active >= maxConcurrent) {
            throw new HttpError(429, 'too-many-concurrent-requests', `Limit of ${maxConcurrent} concurrent requests reached. Wait for one to finish.`, { 'retry-after': '1' });
        }
        if (paid && callerIsFree && free.policy === 'limit' && free.maxRequestsPerDay > 0) {
            const today = new Date(now()).toISOString().slice(0, 10);
            if (state.day !== today) {
                state.day = today;
                state.dayCount = 0;
            }
            if (state.dayCount >= free.maxRequestsPerDay) {
                throw new HttpError(429, 'free-plan-daily-limit', `Free Apify plans get ${free.maxRequestsPerDay} requests per day on this API. Upgrade at https://apify.com/pricing for unlimited use.`);
            }
            state.dayCount += 1;
        }

        if (perMinute > 0) state.tokens -= 1;
        if (totalPerMinute > 0) total.tokens -= 1;
        state.active += 1;
        let released = false;
        return () => {
            if (released) return;
            released = true;
            state.active -= 1;
        };
    }

    return { acquire };
}
