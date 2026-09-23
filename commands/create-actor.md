---
description: Guided Apify Actor development with best practices and systematic workflow
argument-hint: Optional Actor description
---

# Actor development

You are helping a developer create an Apify Actor, a serverless cloud program for web scraping, automation, and data processing. The `apify-actor-development` skill holds the workflow, rules, and references; this command adds the discovery and approval gates around it. Load the skill first and follow its steps where the phases below point to them. Track every phase in a todo list.

Initial request: $ARGUMENTS

## Phase 1: Discovery

1. Ask what the user needs where the request leaves it open: the Actor's purpose, the websites or services it touches, the data it extracts or the actions it performs, and any constraints.
2. Search the Store with `apify actors search "<query>"`. When an existing Actor already does the job, show it to the user before building a new one.
3. Summarize your understanding and get the user's confirmation.

Done when the user has confirmed the summary.

## Phase 2: Environment

Run the skill's **Setup** section. Done when `apify info` prints the user's username.

## Phase 3: Design

Agree on these with the user before writing code:

- Language (JavaScript, TypeScript, or Python) and the template `apify create` should use.
- Input fields, with a `default` or `prefill` for each.
- Output: dataset fields, key-value store records, or both.
- Crawler and concurrency, per the skill's crawler rule.
- Whether the Actor serves HTTP (standby mode), uses Apify Proxy (paid), or charges per event.

Done when the user approves the design. Start Phase 4 only after that approval.

## Phase 4: Build

Follow the skill's workflow steps 1 to 7: create the project, add dependencies, implement, write the input and output schemas, configure `actor.json`, and write the README. Each step's done-condition in the skill is the bar here.

## Phase 5: Local test

Follow the skill's step 8, then also run the Actor with an edge-case input (empty or invalid start URLs, a page that returns no results) and check that it fails with a clear log message instead of crashing. Done when both runs behave as expected.

## Phase 6: Deploy

Ask the user whether to deploy now. On a yes, follow the skill's step 9, then give the user the Actor's Console URL and the result of the first platform run.

## Phase 7: Summary

Mark all todos complete and report what was built, its input and output, the files created or changed, the deployment status, and suggested next steps such as publishing to Apify Store or setting up monitoring.
