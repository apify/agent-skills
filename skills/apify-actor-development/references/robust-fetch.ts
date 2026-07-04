// Robust fetch helper for Actors — wraps every network call in try/catch,
// retries on transient failures with exponential backoff, and surfaces the
// final error through the Apify logger so it appears in the run log.
//
// Import from your Actor entry point:
//
//   import { robustFetch } from './robust-fetch';
//   const data = await robustFetch<MyResponse>('https://api.example.com/x');

import { Actor, log } from 'apify';

export interface RobustFetchOptions extends RequestInit {
    /** Maximum number of attempts, including the first one. Default: 4. */
    retries?: number;
    /** Base delay in milliseconds — the actual delay is `base * 2**attempt`. Default: 500. */
    backoffBaseMs?: number;
    /** Fail after this many milliseconds per attempt. Default: 30_000. */
    timeoutMs?: number;
    /** HTTP status codes that should be retried in addition to network errors. */
    retryStatuses?: number[];
}

const DEFAULT_RETRY_STATUSES = [408, 425, 429, 500, 502, 503, 504];

export async function robustFetch<T = unknown>(
    url: string,
    options: RobustFetchOptions = {},
): Promise<T> {
    const {
        retries = 4,
        backoffBaseMs = 500,
        timeoutMs = 30_000,
        retryStatuses = DEFAULT_RETRY_STATUSES,
        ...init
    } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt < retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, { ...init, signal: controller.signal });
            clearTimeout(timer);

            if (!response.ok) {
                if (retryStatuses.includes(response.status) && attempt < retries - 1) {
                    const wait = backoffBaseMs * 2 ** attempt;
                    log.warning(`fetch ${url} returned ${response.status}; retrying in ${wait}ms`);
                    await new Promise((r) => setTimeout(r, wait));
                    continue;
                }
                throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
            }

            // Assume JSON — callers that need a different content type should use fetch directly.
            return (await response.json()) as T;
        } catch (err) {
            clearTimeout(timer);
            lastError = err;

            const isLast = attempt >= retries - 1;
            if (isLast) break;

            const wait = backoffBaseMs * 2 ** attempt;
            log.warning(`fetch ${url} failed (attempt ${attempt + 1}/${retries}): ${(err as Error).message}; retrying in ${wait}ms`);
            await new Promise((r) => setTimeout(r, wait));
        }
    }

    // Surface the failure through the Apify logger so it appears in the run log,
    // then rethrow so the caller can decide whether to Actor.fail() or continue.
    log.exception(lastError as Error, `fetch ${url} failed after ${retries} attempts`);
    throw lastError;
}
