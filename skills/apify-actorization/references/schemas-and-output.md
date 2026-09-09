# Schemas and output configuration

## Input schema

Map your application's inputs to `.actor/input_schema.json`. Validate against the JSON Schema from the `@apify/json_schemas` npm package (`input.schema.json`).

```json
{
    "title": "My Actor Input",
    "type": "object",
    "schemaVersion": 1,
    "properties": {
        "startUrl": {
            "title": "Start URL",
            "type": "string",
            "description": "The URL to start processing from",
            "editor": "textfield",
            "prefill": "https://example.com"
        },
        "maxItems": {
            "title": "Max Items",
            "type": "integer",
            "description": "Maximum number of items to process",
            "default": 100,
            "minimum": 1
        }
    },
    "required": ["startUrl"]
}
```

### Mapping guidelines

- Command-line arguments → input schema properties
- Environment variables → input schema or Actor env vars in actor.json
- Config files → input schema with object/array types
- Flatten deeply nested structures for better UX

## Output schema

Choose where output goes, then write the schema files (`output_schema.json`, `dataset_schema.json`, `key_value_store_schema.json`) by invoking the `apify-actor-development` skill, whose `references/output-schemas.md` holds the rules.

### For table-like data (multiple items)

- Use `Actor.pushData()` (JS) or `Actor.push_data()` (Python)
- Each item becomes a row in the dataset

### For single files or blobs

- Use key-value store: `Actor.setValue()` / `Actor.set_value()`
- Get the public URL and include it in the dataset:

```javascript
// Store file with public access
await Actor.setValue('report.pdf', pdfBuffer, { contentType: 'application/pdf' });

// Get the public URL
const storeInfo = await Actor.openKeyValueStore();
const publicUrl = `https://api.apify.com/v2/key-value-stores/${storeInfo.id}/records/report.pdf`;

// Include URL in dataset output
await Actor.pushData({ reportUrl: publicUrl });
```

### For multiple files with a common prefix (collections)

```javascript
// Store multiple files with a prefix
for (const [name, data] of files) {
    await Actor.setValue(`screenshots/${name}`, data, { contentType: 'image/png' });
}
// Files are accessible at: .../records/screenshots%2F{name}
```

## Actor configuration (actor.json)

Configure `.actor/actor.json`. Validate against the JSON Schema from the `@apify/json_schemas` npm package (`actor.schema.json`).

```json
{
    "actorSpecification": 1,
    "name": "my-actor",
    "title": "My Actor",
    "description": "Brief description of what the Actor does",
    "version": "1.0.0",
    "meta": {
        "templateId": "ts_empty",
        "generatedBy": "Claude Code with Claude Opus 4.5"
    },
    "input": "./input_schema.json",
    "dockerfile": "../Dockerfile"
}
```

**Important:** Fill in the `generatedBy` property with the tool/model used.

## State management

### Request queue - for pausable task processing

The request queue works for any task processing, not just web scraping. Use a dummy URL with custom `uniqueKey` and `userData` for non-URL tasks:

```javascript
const requestQueue = await Actor.openRequestQueue();

// Add tasks to the queue (works for any processing, not just URLs)
await requestQueue.addRequest({
    url: 'https://placeholder.local',  // Dummy URL for non-scraping tasks
    uniqueKey: `task-${taskId}`,       // Unique identifier for deduplication
    userData: { itemId: 123, action: 'process' },  // Your custom task data
});

// Process tasks from the queue (with Crawlee)
const crawler = new BasicCrawler({
    requestQueue,
    requestHandler: async ({ request }) => {
        const { itemId, action } = request.userData;
        // Process your task using userData
        await processTask(itemId, action);
    },
});
await crawler.run();

// Or manually consume without Crawlee:
let request;
while ((request = await requestQueue.fetchNextRequest())) {
    await processTask(request.userData);
    await requestQueue.markRequestHandled(request);
}
```

### Key-value store - for checkpoint state

```javascript
// Save state
await Actor.setValue('STATE', { processedCount: 100 });

// Restore state on restart
const state = await Actor.getValue('STATE') || { processedCount: 0 };
```
