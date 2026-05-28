# Agent-skills evals

Eval-driven approach to improving these skills: prove a behavior gap with a
failing eval *before* changing any skill file. Most routing fixes turn out to
be a one-line `description` change — small, reviewable PRs, not rewrites.

## Layout

```
evals/
├── README.md                       (this file)
├── routing.json                    cross-skill routing — which skill should be invoked?
├── apify-actor-development.json    behavioral — once this skill is loaded, what should happen?
├── apify-sdk-integration.json      behavioral
└── apify-ultimate-scraper.json     behavioral
```

One file per skill. Within each per-skill file, every entry has a `type`
field that categorizes the eval (e.g., `discovery`, `integrate`, `build`,
`selection`, `run`, `cost`, `workflow:lead-generation`). Filter by `type`
to focus on one area.

## Schemas

### `routing.json` — cross-skill routing

Given the agent only sees skill names + descriptions (no skill bodies), does
it pick the right skill for the prompt? Only `description` fields drive
selection, so this layer tests descriptions.

```json
{
  "prompt": "user input",
  "expected_skill": "apify-sdk-integration",
  "acceptable_skills": ["apify-ultimate-scraper"],
  "rationale": "why this skill wins, and which overlap it disambiguates"
}
```

- `expected_skill` — the single best skill.
- `acceptable_skills` — optional; defensible alternates that count as a soft
  pass. Use sparingly — many alternates means the descriptions overlap, which
  is itself the finding.
- A pick outside `expected_skill` ∪ `acceptable_skills` is a FAIL and points
  at the description to fix.

### `<skill>.json` — behavioral

Given the skill **is** loaded, does the agent follow its intended commands,
process, and conventions?

```json
{
  "prompt": "user input",
  "expected": "OUTCOME. Concrete, checkable steps the response must take.",
  "type": "discovery"
}
```

- `type` values used today:
  - `apify-actor-development.json`: `build`, `cli`
  - `apify-sdk-integration.json`: `discovery`, `integrate`
  - `apify-ultimate-scraper.json`: `selection`, `schema-and-gotchas`, `run`,
    `cost`, `workflow:<workflow-name>` (one per `references/workflows/*.md`)

Workflow types use the `workflow:` prefix so a runner can filter all workflow
evals at once (`startsWith("workflow:")`) while preserving which workflow a
specific entry tests.

## What "pass" means

Borrowed from the skill-authoring guide — keep checks small and must-pass:

- **Outcome** — did the task succeed (right skill chosen / right command run)?
- **Process** — did it follow the intended tools/steps, not a lucky shortcut?
- **Style** — does output follow the skill's conventions?
- **Efficiency** — did it avoid thrashing (redundant searches, wrong-then-retry)?

## Running

In Claude Code:

```
Run evals/routing.json. For each entry, show the agent only the skill
names+descriptions and the prompt; report which skill it picks vs
expected_skill (acceptable_skills = soft pass). Summarize pass/fail and group
failures by the description that needs work.
```

```
Run evals/<skill>.json (optionally filter by type). For each entry, spawn an
agent with that skill loaded and compare the response against `expected`.
Report pass/fail.
```

## Counts

| File | Entries |
|------|--------:|
| `routing.json` | 10 |
| `apify-actor-development.json` | 8 |
| `apify-sdk-integration.json` | 9 |
| `apify-ultimate-scraper.json` | 89 |
| **Total** | **116** |
