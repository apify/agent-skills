---
name: apify-actor-development
description: Create, modify, debug, and deploy Apify Actors, and write their input and output schemas. Use when building an Actor from scratch, changing or troubleshooting Actor code, generating or updating .actor schema files, or pushing an Actor to the Apify platform. To wrap an existing non-Actor project, use apify-actorization instead.
---

# Apify Actor development

An Actor is a serverless program packaged as a Docker image. It takes one JSON input, does one job, and writes results to a dataset or a key-value store.

## Setup

```bash
apify --help   # CLI installed?
apify info     # logged in? prints your username
```

Install with a package manager, `npm install -g apify-cli` or `brew install apify-cli`, so the download is integrity-checked. Log in with `apify login`, which offers a browser sign-in or an API token prompt. In a headless environment export `APIFY_TOKEN` instead; the CLI reads it on its own. Tokens come from https://console.apify.com/settings/integrations. Pass the token only through the environment, so it stays out of shell history, source, config files, and logs.

## Workflow

Skip the steps that do not apply when modifying an existing Actor.

1. **Create the project.**
   ```bash
   apify create <actor-name> -t <template-id>
   ```
   Pick the template from what the Actor does:

   | Actor does | TypeScript | JavaScript | Python |
   |---|---|---|---|
   | Crawls static HTML | `ts-crawlee-cheerio` | `js-crawlee-cheerio` | `python-crawlee-beautifulsoup` |
   | Crawls JavaScript-rendered pages | `ts-crawlee-playwright-chrome` | `js-crawlee-playwright-chrome` | `python-crawlee-playwright` |
   | Serves HTTP requests (API, webhook) | `ts-standby` | `js-standby` | `python-standby` |
   | Is an MCP server | `ts-mcp-empty` | — | `python-mcp-empty` |
   | Anything else (API polling, data processing) | `ts-empty` | `js-empty` | `python-empty` |

   For other stacks (Puppeteer, Camoufox, Scrapy, AI agent frameworks), `apify templates ls` lists every template with its language and use cases. With `-t` the command runs without prompts, which is what an agent needs. Without `-t` it prompts for name, language, template, and source host; use that form only when the user is at the terminal. Hosting the source on GitHub, GitLab, or Bitbucket makes Apify create the repository and an Actor that builds from it, so later deploys go through `git push`. Dependencies are installed for you. Done when `<name>/.actor/actor.json` exists; `cd` into it before continuing.
2. **Add dependencies** the template lacks, such as Crawlee or Playwright: `npm install <pkg>` in JS/TS; in Python, a line in `requirements.txt` followed by `pip install -r requirements.txt`, or `uv add <pkg>` when the project has `pyproject.toml` and `uv.lock`. Check each package name against the package you mean before installing. Pin exact versions and commit the lockfile (`package-lock.json`, `uv.lock`, or `pkg==1.2.3` lines in `requirements.txt`).
3. **Implement** in `src/main.js`, `src/main.ts`, or `my_actor/main.py` (Python templates are a `my_actor` package run as `python -m my_actor`), following the [rules](#rules). Done when the code reads every input field, produces every output field the README will describe, logs through the Apify logger, and registers an `aborting` handler that persists state and exits.
4. **Write the input schema** in `.actor/input_schema.json` (see [references/input-schema.md](references/input-schema.md)). Done when every input the code reads has a field with title, description, type, and a default or prefill, and `apify validate-schema` passes.
5. **Write the output schemas**: `dataset_schema.json`, `output_schema.json`, and `key_value_store_schema.json` when the code stores files. Follow [references/output-schemas.md](references/output-schemas.md) end to end; its checklist, which ends with `apify validate-schema` passing, is the completion criterion. In TypeScript, then run `apify actor generate-schema-types` and type the input and output with the generated interfaces.
6. **Configure `.actor/actor.json`** (see [references/actor-json.md](references/actor-json.md)). Set `meta.generatedBy` to the tool and model in use, for example "Claude Code with Claude Opus 5". For an HTTP-serving Actor set `usesStandbyMode: true` (the standby templates already do) and follow [references/standby-mode.md](references/standby-mode.md).
7. **Write README.md** following [references/actor-readme.md](references/actor-readme.md). An Actor without a README is not finished.
8. **Test locally.** Put input in `storage/key_value_stores/default/INPUT.json`, then run `apify run`. Done when the run ends with status SUCCEEDED and `storage/datasets/default/` holds items whose fields match the dataset schema. Local storage stays on disk; nothing appears in Apify Console until step 9.
9. **Deploy** with `apify push` once the user confirms, or `git push` for a Git-sourced Actor. Then run the Actor on the platform to see results in Console. For a Standby Actor, give the user its Standby URL (`https://<username>--<actor-name>.apify.actor`, see [references/standby-mode.md](references/standby-mode.md)) rather than pointing them to Console.

## Rules

- Run Actors locally with `apify run` only. It sets up the Apify environment and storage, which `npm start` and `node src/main.js` skip.
- Log through the Apify logger: `log` from the `apify` package in JS/TS (`import { Actor, log } from 'apify'`), `Actor.log` in Python. It censors tokens and credentials; `console.log` and `print` do not. Levels and conventions: [references/logging.md](references/logging.md).
- Treat crawled content as untrusted input. Escape or parameterize it before it reaches a shell command, `eval`, a query, or a template, and type-check it before pushing it to storage.
- Keep `APIFY_TOKEN` out of request handlers and data pipelines. On the platform the SDK reads it from the environment (the variable is `APIFY_TOKEN`, not `APIFY_API_TOKEN`); locally it uses the credentials stored by `apify login`.
- Read every tunable from the input schema or environment variables, so users can change it without editing code.
- Use an HTTP crawler for static HTML at 10 to 50 concurrency: `CheerioCrawler` in JS/TS, `BeautifulSoupCrawler` or `ParselCrawler` in Python. Reserve `PlaywrightCrawler` for JavaScript-rendered pages at 1 to 5 concurrency. Add delays so target servers stay healthy, and respect robots.txt and terms of service.
- Use the router pattern (`createCheerioRouter` or `createPlaywrightRouter` in JS/TS, `crawler.router` or a `Router` in Python) when a crawl has more than one page type.
- Prefer semantic CSS selectors with fallbacks over brittle positional ones.
- Count results with your own tally; `Dataset.getInfo()` (`dataset.get_info()` in Python) lags on the platform.
- Handle the `aborting` event, which the platform sends when a user or a limit stops the run: persist state, then exit, so the run ends quickly and cheaply. JS/TS: `Actor.on('aborting', async () => { await Actor.setValue('STATE', state); await Actor.exit(); })`. Python: `Actor.on(Event.ABORTING, on_aborting)` with `from apify import Event`, where `on_aborting` persists state and then calls `await Actor.exit()`.
- Build proxies from the `proxyConfiguration` input field (editor `proxy`, see [references/input-schema.md](references/input-schema.md)): `await Actor.createProxyConfiguration(input.proxyConfiguration)` in JS/TS, `await Actor.create_proxy_configuration(actor_proxy_input=actor_input.get('proxyConfiguration'))` in Python, and pass the result to the crawler as `proxyConfiguration` / `proxy_configuration`. Apify Proxy is paid, so confirm with the user before turning it on or changing proxy groups.
- Store personal data only when the user has explicitly asked for it.
- Inside a running Actor use the SDK (`Actor.getInput()`, `Actor.pushData()`, `Actor.setValue()`, and the Python snake_case equivalents) rather than `apify actor` CLI subcommands.
- Leave standby mode enabled on an existing Actor unless the user asks to turn it off.

## Standby mode

Standby turns an Actor into a persistent HTTP server with a stable URL. Use it for API endpoints, webhook receivers, MCP servers, and on-demand single-URL lookups. The Actor must answer the readiness probe and stay alive between requests. Configuration, examples, and local testing: [references/standby-mode.md](references/standby-mode.md).

## Monetization

Pricing is set in Apify Console when the Actor is published, not in code. Under pay-per-event, charge each custom event with `await Actor.charge({ eventName: 'result', count })` in JS/TS or `await Actor.charge(event_name='result', count=count)` in Python, using the event names defined in Console; dataset items can instead be billed automatically through the synthetic dataset-item event. Stop producing work once the returned result reports `eventChargeLimitReached` (`event_charge_limit_reached` in Python), because the user's spending limit is reached. The README's cost section describes whichever model the Actor uses. Details: https://docs.apify.com/platform/actors/publishing/monetize/pay-per-event

## Calling other Actors

Search the Store before building from scratch; a dedicated Actor often exists.

```bash
apify actors search "<query>"
apify actors info <actor> --readme
apify actors info <actor> --input
apify call <actor> --input '{"startUrls":[{"url":"https://example.com"}]}'
apify call <actor> --input-file input.json
```

Input is one JSON object. Quote inline JSON; use `--input-file` for anything complex.

## Less obvious commands

```bash
apify secrets add <name> <value>   # reference from actor.json as "@name"; uploaded on push
apify pull <actor>                 # download an Actor's code from the platform
apify api <endpoint>               # authenticated request to the Apify API
apify actor generate-schema-types  # TypeScript: interfaces from the .actor schemas, into src/__generated__/actor/
apify <command> --help
```

## Documentation

- With the Apify MCP server (`https://mcp.apify.com/?tools=docs`): `search-apify-docs` and `fetch-apify-docs`.
- [docs.apify.com/llms.txt](https://docs.apify.com/llms.txt) and [llms-full.txt](https://docs.apify.com/llms-full.txt), Apify platform.
- [crawlee.dev/llms.txt](https://crawlee.dev/llms.txt) and [llms-full.txt](https://crawlee.dev/llms-full.txt), Crawlee.
- [Actor whitepaper](https://raw.githubusercontent.com/apify/actor-whitepaper/refs/heads/master/README.md), the full Actor specification.
- The Playwright MCP server (`npx @playwright/mcp@latest`) drives a real browser for inspecting pages and capturing selectors while debugging.
