# Actor Standby Mode Reference

## When to Use Standby Mode

Use Standby when the Actor must respond to HTTP requests in real time - API endpoints, webhook receivers, real-time data lookups, MCP servers, or any synchronous request-response pattern.

Do NOT use Standby for batch jobs (scraping, crawling, data pipelines, scheduled exports). Use the default batch mode instead.

## Configuration

### actor.json

Set `usesStandbyMode: true` in `.actor/actor.json`:

```json
{
    "actorSpecification": 1,
    "name": "my-api-actor",
    "title": "My API Actor",
    "version": "0.0",
    "usesStandbyMode": true,
    "webServerSchema": "./openapi.json",
    "meta": {
        "generatedBy": "<FILL-IN-TOOL-AND-MODEL>"
    },
    "dockerfile": "../Dockerfile"
}
```

### OpenAPI Schema (`webServerSchema`)

Define an OpenAPI v3 schema describing the Actor's HTTP endpoints. This can be a file path (e.g., `"./openapi.json"`) or an inline object in `actor.json`.

**Why:** The schema is rendered as Swagger UI in the Standby tab of Apify Console and on the Actor's Store page. This lets users browse endpoint documentation and try out the API directly from the browser.

The presence of `webServerSchema` also counts as a quality metric for Actor publication.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ACTOR_WEB_SERVER_PORT` | Port the HTTP server must listen on. Access via SDK: JS `Actor.config.get('containerPort')`, Python `Actor.config.container_port` |
| `ACTOR_STANDBY_URL` | The public Standby URL (stable across runs, format: `https://<username>--<actor-name>.apify.actor`) |
| `APIFY_META_ORIGIN` | Set to `STANDBY` when the Actor was launched in Standby mode |

## Readiness Probe

The platform sends `GET /` requests with the header `x-apify-container-server-readiness-probe` to check server readiness. You MUST respond with HTTP 200. Keep the response lightweight.

## Authentication

Callers authenticate to Standby URLs via:
- **Bearer token** (recommended): `Authorization: Bearer <APIFY_TOKEN>`
- **Query parameter** (fallback): `?token=<APIFY_TOKEN>`

## Input Handling

Standby Actors receive per-request input via HTTP query parameters or request body — NOT via `INPUT.json`. The traditional input schema (`input_schema.json`) is used for Actor initialization/configuration only, not per-request data.

## Complete Examples

### JavaScript / TypeScript (Express)

```javascript
import { Actor, log } from 'apify';
import express from 'express';

await Actor.init();

const app = express();
app.use(express.json());
const port = Actor.config.get('containerPort');

// Readiness probe
app.get('/', (req, res) => {
    if (req.headers['x-apify-container-server-readiness-probe']) {
        return res.send('OK');
    }
    res.json({ status: 'Actor is running in Standby mode' });
});

// Example endpoint
app.get('/search', (req, res) => {
    const { query } = req.query;
    log.info('Handling search request', { query });
    // ... handle request ...
    res.json({ results: [] });
});

app.listen(port, () => log.info(`Listening on port ${port}`));
```

### Python (FastAPI)

```python
from apify import Actor
import uvicorn
from fastapi import FastAPI, Request

app = FastAPI()

@app.get('/')
async def root(request: Request):
    if 'x-apify-container-server-readiness-probe' in request.headers:
        return {'status': 'OK'}
    return {'status': 'Actor is running in Standby mode'}

@app.get('/search')
async def search(query: str):
    Actor.log.info('Handling search request', extra={'query': query})
    # ... handle request ...
    return {'results': []}

async def main():
    async with Actor:
        port = Actor.config.container_port
        server = uvicorn.Server(uvicorn.Config(app, host='0.0.0.0', port=port))
        await server.serve()

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())
```

## Rules

- **NEVER disable standby mode** (`usesStandbyMode: false`) in `.actor/actor.json` without explicit user permission
- **NEVER call `Actor.exit()`** after handling a request — the server must stay alive
- **ALWAYS listen on the SDK-provided port**, not a hardcoded value
- **ALWAYS implement the readiness probe** at `GET /`
- **Standby Actor READMEs** must document: available endpoints, HTTP methods, request/response schemas, authentication (`Authorization: Bearer <token>`), and example calls.

## Testing

`apify run` does not simulate Standby mode. To test locally:

1. Start the HTTP server directly (e.g., `node src/main.js` or `python src/main.py`)
2. Send requests with curl/httpie to verify endpoints
3. Test the readiness probe: `curl -H "x-apify-container-server-readiness-probe: true" http://localhost:<port>/`
4. Deploy with `apify push` and test via the Standby URL. Local Standby URLs use the format `http://<username>--<actor-name>.localhost:8003/<path>?token=<APIFY_TOKEN>` (e.g., `http://meaningful-sand--standby-actor.localhost:8003?token=apify_api_...`)

## Standby vs. Container Web Server

Do not confuse these:
- **Container web server** (`ACTOR_WEB_SERVER_URL`): per-run unique URL, no load balancing, no auto-scaling. Useful for live view UIs during a run.
- **Standby mode** (`ACTOR_STANDBY_URL`): stable hostname, load-balanced across runs, auto-scaled based on traffic. Use this for production APIs.

## Further Reading

- [Developing Actors using Standby mode](https://docs.apify.com/platform/actors/development/programming-interface/standby#developing-actors-using-standby-mode)
- [Running Actors in Standby mode](https://docs.apify.com/platform/actors/running/standby)
