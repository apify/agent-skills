# Actor-to-Actor orchestration

## Calling other Actors from code

### Synchronous (wait for result)

**JavaScript:**
```javascript
import { Actor } from 'apify';

const run = await Actor.call('apify/web-scraper', {
    startUrls: [{ url: 'https://example.com' }],
    maxPagesPerCrawl: 10,
});

const dataset = await Actor.openDataset(run.defaultDatasetId);
const { items } = await dataset.getData();
```

**Python:**
```python
from apify import Actor

run = await Actor.call('apify/web-scraper', run_input={
    'startUrls': [{'url': 'https://example.com'}],
    'maxPagesPerCrawl': 10,
})

dataset = await Actor.open_dataset(name=None, id=run['defaultDatasetId'])
items = await dataset.get_data()
```

`Actor.call()` blocks until the called Actor finishes. Use for short-running Actors.

### Asynchronous (fire and forget)

**JavaScript:**
```javascript
const run = await Actor.start('apify/web-scraper', {
    startUrls: [{ url: 'https://example.com' }],
});

// Continue other work...

// Later, check the result
const client = Actor.newClient();
const finishedRun = await client.run(run.id).waitForFinish();
```

**Python:**
```python
run = await Actor.start('apify/web-scraper', run_input={
    'startUrls': [{'url': 'https://example.com'}],
})

# Continue other work...

# Later, check the result
client = Actor.new_client()
finished_run = await client.run(run['id']).wait_for_finish()
```

Use `Actor.start()` for long-running Actors or when you don't need to wait for results.

### Calling Tasks

```javascript
const run = await Actor.callTask('username/my-task-name', { overrideInput: 'value' });
```

Tasks are preconfigured Actor runs. Calling a Task uses its saved input, optionally merged with any overrides you pass.

## Metamorph

Metamorph replaces the current Actor's container with a different Actor while preserving all default storage.

**JavaScript:**
```javascript
await Actor.metamorph('apify/web-scraper', {
    startUrls: [{ url: 'https://example.com' }],
});

// Code after metamorph() never executes — the container is replaced
```

**Python:**
```python
await Actor.metamorph('apify/web-scraper', run_input={
    'startUrls': [{'url': 'https://example.com'}],
})
```

**Key constraints:**
- Maximum 10 metamorphs per run
- The new Actor reads input from `INPUT-METAMORPH-N` key (N = metamorph count)
- All default storage (dataset, KV store, request queue) is shared with the new Actor
- Actors with restricted permissions can only metamorph into Actors with equal or lesser permissions

**Use case:** A router Actor inspects the input URL, determines which specialized scraper to use, and metamorphs into it. The scraper inherits the same dataset and writes its results there.

## Webhook chaining

Connect Actors without modifying their code by configuring webhooks.

**Setup (via Console):**
1. Go to the source Actor's Integrations tab
2. Add a new integration → select target Actor or Task
3. Choose trigger event (e.g., "Run succeeded")
4. Configure input for the target Actor using variable interpolation

**Payload variables:**
- `{{resource}}` — the full run or build object
- `{{resource.defaultDatasetId}}` — the source run's dataset ID
- `{{resource.defaultKeyValueStoreId}}` — the source run's KV store ID
- `{{resource.id}}` — the source run ID

**Setup (via API):**
When starting a run via API, pass a webhook definition:
```
POST /v2/acts/{actorId}/runs?webhooks=[{
    "eventTypes": ["ACTOR.RUN.SUCCEEDED"],
    "requestUrl": "https://api.apify.com/v2/acts/{targetActorId}/runs?token=...",
    "payloadTemplate": "{\"datasetId\": \"{{resource.defaultDatasetId}}\"}"
}]
```

## Shared named storage

Multiple independent Actors can read from and write to the same named storage.

**Pattern: Fan-out/fan-in pipeline**
1. Orchestrator Actor creates a named request queue with work items
2. Multiple worker Actor runs consume from the same queue (with locking)
3. Workers write results to a shared named dataset
4. Orchestrator monitors completion and triggers downstream processing

**Pattern: Shared state**
1. Actor A writes current state to a named KV store
2. Actor B (or a later run of Actor A) reads the state to continue work
3. Useful for long-running processes that span multiple Actor runs

## Choosing an orchestration pattern

| I want to... | Use |
|---|---|
| Run Actor B as a subroutine of Actor A | `Actor.call()` |
| Start Actor B from Actor A without waiting | `Actor.start()` |
| Replace Actor A with Actor B, sharing storage | `Actor.metamorph()` |
| Trigger Actor B when Actor A finishes (no code changes) | Webhook |
| Distribute work across multiple Actor runs | Shared named request queue |
| Pass results between independent Actor runs | Shared named dataset or KV store |
| Run a preconfigured Actor with saved input | `Actor.callTask()` or start Task via API |
