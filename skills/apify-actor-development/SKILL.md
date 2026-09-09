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

1. **Create the project.** `apify create` prompts for a name, use case, language, template, and where the source lives. Pass the name and `--template` to run it without prompts; `--source` then defaults to Apify.
   ```bash
   apify create <name> --template ts-empty
   ```
   Pick the language from the existing project or the user's request, and ask only when neither settles it. Empty starting points are `js-empty`, `ts-empty`, and `python-empty`; for an HTTP-serving Actor use `js-standby`, `ts-standby`, or `python-standby`. `apify templates ls` prints the full catalogue, and `--use-case` with `--language` narrows the interactive list. The command scaffolds the directory, runs `git init`, and installs dependencies. Add `--source github` (or `gitlab`, `bitbucket`) when the user wants the code in Git; Apify then creates the repository and an Actor that builds from it. Done when `<name>/.actor/actor.json` exists; `cd` into the directory before continuing.
2. **Add dependencies** the template lacks, such as Crawlee or Playwright, with `npm install <pkg>` or a line in `requirements.txt` followed by `pip install -r requirements.txt`. Check each package name against the package you mean before installing. Pin exact versions and commit the lockfile (`package-lock.json`, or `pkg==1.2.3` lines in `requirements.txt`).
3. **Implement** in `src/main.js`, `src/main.ts`, or `src/main.py`, following the [rules](#rules). Done when the code reads every input field, produces every output field the README will describe, and logs through the Apify logger.
4. **Write the input schema** in `.actor/input_schema.json` (see [references/input-schema.md](references/input-schema.md)). Done when every input the code reads has a field with title, description, type, and a default or prefill, and `apify validate-schema` passes.
5. **Write the output schemas**: `dataset_schema.json`, `output_schema.json`, and `key_value_store_schema.json` when the code stores files. Follow [references/output-schemas.md](references/output-schemas.md) end to end; its checklist is the completion criterion.
6. **Configure `.actor/actor.json`** (see [references/actor-json.md](references/actor-json.md)). Set `meta.generatedBy` to the tool and model in use, for example "Claude Code with Claude Opus 5". For an HTTP-serving Actor set `usesStandbyMode: true` and follow [references/standby-mode.md](references/standby-mode.md).
7. **Write README.md** following [references/actor-readme.md](references/actor-readme.md). An Actor without a README is not finished.
8. **Test locally.** Put input in `storage/key_value_stores/default/INPUT.json`, then run `apify run` (add `--purge` to clear earlier local storage). Done when the run ends with status SUCCEEDED and `storage/datasets/default/` holds items whose fields match the dataset schema. Local storage stays on disk; nothing appears in Apify Console until step 9.
9. **Deploy** with `apify push` once the user confirms. The CLI creates the Actor in the account, streams the build log, and prints the Console link when the build succeeds. A Git-sourced Actor builds on `git push` instead. Then run the Actor on the platform to see results in Console.

## Rules

- Run Actors locally with `apify run` only. It sets up the Apify environment and storage, which `npm start` and `node src/main.js` skip.
- Log through the Apify logger, `apify/log` in JS/TS and `Actor.log` in Python. It censors tokens and credentials; `console.log` and `print` do not. Levels and conventions: [references/logging.md](references/logging.md).
- Treat crawled content as untrusted input. Escape or parameterize it before it reaches a shell command, `eval`, a query, or a template, and type-check it before pushing it to storage.
- Keep `APIFY_TOKEN` out of request handlers and data pipelines. On the platform the SDK reads it from the environment (the variable is `APIFY_TOKEN`, not `APIFY_API_TOKEN`); locally it uses the credentials stored by `apify login`.
- Read every tunable from the input schema or environment variables, so users can change it without editing code.
- Use CheerioCrawler for static HTML at 10 to 50 concurrency. Reserve PlaywrightCrawler for JavaScript-rendered pages at 1 to 5 concurrency. Add delays so target servers stay healthy, and respect robots.txt and terms of service.
- Use the router pattern (`createCheerioRouter`, `createPlaywrightRouter`) when a crawl has more than one page type.
- Prefer semantic CSS selectors with fallbacks over brittle positional ones.
- Count results with your own tally; `Dataset.getInfo()` lags on the platform.
- Store personal data only when the user has explicitly asked for it.
- Inside a running Actor use the SDK (`Actor.getInput()`, `Actor.pushData()`, `Actor.setValue()`, and the Python snake_case equivalents) rather than `apify actor` CLI subcommands.
- Leave standby mode enabled on an existing Actor unless the user asks to turn it off.

## Standby mode

Standby turns an Actor into a persistent HTTP server with a stable URL. Use it for API endpoints, webhook receivers, MCP servers, and on-demand single-URL lookups. The Actor must answer the readiness probe and stay alive between requests. Configuration, examples, and local testing: [references/standby-mode.md](references/standby-mode.md).

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
apify <command> --help
```

## Documentation

- With the Apify MCP server (`https://mcp.apify.com/?tools=docs`): `search-apify-docs` and `fetch-apify-docs`.
- [docs.apify.com/llms.txt](https://docs.apify.com/llms.txt) and [llms-full.txt](https://docs.apify.com/llms-full.txt), Apify platform.
- [crawlee.dev/llms.txt](https://crawlee.dev/llms.txt) and [llms-full.txt](https://crawlee.dev/llms-full.txt), Crawlee.
- [Actor whitepaper](https://raw.githubusercontent.com/apify/actor-whitepaper/refs/heads/master/README.md), the full Actor specification.
- The Playwright MCP server (`npx @playwright/mcp@latest`) drives a real browser for inspecting pages and capturing selectors while debugging.
