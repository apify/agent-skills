// Persisting state across scheduled / cron Actor runs.
//
// Problem: each Actor run gets its own default key-value store, so state
// written with `Actor.setValue()` disappears when the run ends. Two options
// exist for making state visible to the next run — pick based on the token
// scope the Actor is granted.
//
// (A) Named KV store (preferred when you have full-scope credentials).
//     Requires the Actor's token to be able to open a store by name across
//     runs, which needs a user-scoped token or an "Access to all key-value
//     stores" permission grant.
//
// (B) Fetch the previous run's default KV store via the REST API. Works
//     under LIMITED_PERMISSIONS tokens (the default for scheduled runs of
//     a user's own Actor), because listing your own runs and reading a run's
//     default store only needs runs:read + key-value-stores:read on that
//     specific store. Use this pattern when Actor.openKeyValueStore('name')
//     fails with "Permission denied".
//
// Both patterns require sanitizing keys — see `sanitizeKvKey` below — because
// KV keys must match /^[a-zA-Z0-9!\-_.'()]{1,256}$/.

import { Actor, log } from 'apify';

/**
 * KV keys must match /^[a-zA-Z0-9!\-_.'()]{1,256}$/. Anything else — colons,
 * slashes, spaces, unicode — throws `ArgumentError` from setValue().
 * Replace disallowed characters with `_` and truncate to 256 chars.
 */
export function sanitizeKvKey(raw: string): string {
    const cleaned = raw.replace(/[^a-zA-Z0-9!\-_.'()]/g, '_');
    return cleaned.slice(0, 256);
}

// ---------------------------------------------------------------------------
// (A) Named store — full-scope token
// ---------------------------------------------------------------------------

export async function loadStateFromNamedStore<T>(
    storeName: string,
    key: string,
): Promise<T | undefined> {
    const store = await Actor.openKeyValueStore(storeName);
    return (await store.getValue<T>(sanitizeKvKey(key))) ?? undefined;
}

export async function saveStateToNamedStore<T>(
    storeName: string,
    key: string,
    value: T,
): Promise<void> {
    const store = await Actor.openKeyValueStore(storeName);
    await store.setValue(sanitizeKvKey(key), value);
}

// ---------------------------------------------------------------------------
// (B) Previous run's default KV store — LIMITED_PERMISSIONS token
// ---------------------------------------------------------------------------

/**
 * List this Actor's most recent SUCCEEDED runs (excluding the current one)
 * and return the default KV store ID of the newest one, if any.
 */
export async function findPreviousRunKvStoreId(): Promise<string | undefined> {
    const client = Actor.newClient();
    const actorId = process.env.APIFY_ACTOR_ID;
    const currentRunId = process.env.APIFY_ACTOR_RUN_ID;

    if (!actorId) {
        log.warning('APIFY_ACTOR_ID not set — cross-run state lookup is only meaningful on the platform.');
        return undefined;
    }

    const { items } = await client.actor(actorId).runs().list({
        status: 'SUCCEEDED',
        desc: true,
        limit: 10,
    });

    const previous = items.find((r) => r.id !== currentRunId);
    return previous?.defaultKeyValueStoreId;
}

export async function loadStateFromPreviousRun<T>(key: string): Promise<T | undefined> {
    const storeId = await findPreviousRunKvStoreId();
    if (!storeId) return undefined;

    const client = Actor.newClient();
    const record = await client.keyValueStore(storeId).getRecord<T>(sanitizeKvKey(key));
    return record?.value;
}

// State written to the CURRENT run's default store is what the NEXT run will
// read via loadStateFromPreviousRun — no cross-store write needed.
export async function saveStateForNextRun<T>(key: string, value: T): Promise<void> {
    await Actor.setValue(sanitizeKvKey(key), value);
}
