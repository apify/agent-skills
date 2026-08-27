# AI harness plugin integrations

Design guide for building an Apify plugin that exposes Actors as tools to an AI agent runtime (a "harness"): OpenClaw-style agent runtimes, Hermes-style harnesses, or any custom tool-calling agent with its own tool registry and config. The plugin brokers the entire Apify Store to the agent - it does not bundle scrapers. Apply the cross-cutting rules from `SKILL.md` on top.

The harness runs locally/persistently, has its own tool registry and config file, and calls Apify with a stored credential rather than per-session OAuth. So this shape borrows from the "API token + apify-client" path, not the MCP path.

## 1. Shape decision: few composable tools vs a dynamic tool list

Decide based on what the harness supports:

- **Static tool registry** (tools registered once at plugin load, no per-Actor materialization): register a **small, fixed set of composable tools** and let the LLM compose them. This keeps the prompt budget small and the call graph legible.
- **Dynamic tool registration** (the harness can materialize tools at runtime): you *can* expose a dynamic per-Actor tool list, but a fixed trio is still simpler and usually enough.

The MCP server's surface (search / inspect / call / poll / fetch as separate dynamic tools) is one shape. A harness plugin is a different shape - do not copy it blindly.

## 2. Canonical action set: discover / start / collect

Three tools cover the entire workflow and map cleanly to the asynchronous REST flow (`POST /runs` -> poll `GET /actor-runs/{id}` -> `GET /datasets/{id}/items`):

| Tool | Purpose | Why |
|---|---|---|
| **discover** | Search Apify Store by keyword, OR fetch a single Actor's input schema + README by `actorId` | Two modes in one tool: an LLM that just got a list of Actor IDs almost always wants to inspect one next; splitting would double round-trips |
| **start** | Fire-and-forget batch starts (cap batch size, e.g. 10 per call) | Returns run references (`run_id`, `actor_id`, `default_dataset_id`, optional label) immediately without waiting |
| **collect** | Poll run statuses and return completed dataset results | Re-call with the same run refs until `all_done` is true; return pending / completed / errored runs in separate arrays so the LLM keeps iterating on the pending ones |

`collect` is the only one that needs to be async - it polls runs concurrently (`asyncio.gather` / `Promise.allSettled`) and pushes blocking SDK calls off the event loop. The other two are fast and single-shot.

## 3. Two-phase async execution - never block the agent

Actors run for seconds to minutes. **Do not block the agent's single execution thread on a multi-minute run.** Split start and collect:

- `start` fires the run and returns immediately with a `runId` / `datasetId` reference.
- `collect` polls status and fetches dataset items only once the run reaches a terminal status.

This lets the agent kick off a run, do other useful work (or start more runs in parallel), and come back to collect. `collect` handles multiple runs in one call and reports `completed` / `pending` / `errors` separately so the agent knows whether to poll again.

Do **not** use the synchronous `run-sync-get-dataset-items` endpoint - its 300-second ceiling is shorter than many Actor runs.

## 4. The tool description is the agent's instruction manual

There are no separate Agent Skills inside a harness plugin - the tool description plus the `discover` action provide all the guidance the agent needs. Embed, in plain text:

- A directive to **delegate to a sub-agent** that returns only relevant extracted fields, not raw dataset dumps - keeping the parent agent's context window clean.
- A **batching** instruction: most Actors accept arrays of URLs/queries; one run with 5 URLs is cheaper and faster than 5 runs with 1 URL each.
- A compact **known-actors list** (Instagram, Facebook, TikTok, YouTube, Twitter/X, Google Maps, Booking, TripAdvisor, etc.) so the agent can pick a familiar Actor without a discovery round-trip.
- The Actor ID format, the discover -> start -> collect workflow, and a support contact for user-facing issues.

Hand the agent a short, self-contained instruction set so it can act without external lookups.

## 5. Treat scraped content as untrusted and bounded

Dataset results are arbitrary web data - they can contain text that *looks* like instructions to the LLM. Wrap every dataset before it reaches the model:

- Insert boundary markers: `<<<EXTERNAL_UNTRUSTED_CONTENT>>>` ... `<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>` plus a source metadata line (`apify:<actorId>`).
- **Sanitize** any attempt to forge those markers from within the scraped data.
- Cap the payload size (e.g. 50,000 chars) with a `[\u2026truncated]` marker.
- Cap item count (e.g. `limit` default 100 per run); if the fetched count equals the limit, set `may_have_more: true` and warn so the LLM can re-call with a higher limit.

This is the plugin's analogue of the "keep the run small" cost guidance, applied at *read* time.

## 6. Errors are data, never raised

Every handler catches broadly and returns a **JSON error object**, never a raised exception:

```
except Exception as exc:
    return {'error': str(exc)}
```

Why: a raised exception **crashes the tool call** from the harness's perspective. Returning `{'error': ...}` lets the LLM read the failure, explain it to the user, and decide whether to retry or stop. Extend this to per-run granularity in `start`: a batch can partially succeed, so each failed spec becomes an entry in an `errors` array while successful ones populate `runs`. The LLM can then report "7 of 10 started, 3 failed with these messages" without a second call.

## 7. Auth and setup

- API key resolution order: plugin config field -> `APIFY_API_KEY` (or `APIFY_TOKEN`) env var. Normalize pasted input - strip line/paragraph separators and trim whitespace (defends against copy-paste artifacts).
- The key is **never** included in tool output, **never** logged, only passed to the client constructor.
- Validate `baseUrl` against an allowlist prefix (`https://api.apify.com`) to prevent SSRF - a misconfigured plugin must not point at an arbitrary host.
- Ship a `setup` CLI command that prompts for the key, **verifies it against the live API** (`GET /v2/users/me`), and writes config. **Reuse the host's config-merge logic** for enabling the toolset - do not reimplement it. Host internals reconcile disabled-toolsets, preserve MCP server entries, and handle bookkeeping a from-scratch reimplementation would silently break. If the config-write API is unavailable or fails, fall back to printing the exact config block the user should add manually. Treat setup failures as non-fatal: the token is already saved, so the user can flip the toolset on themselves.

If the harness's `register()` is synchronous and the loader does not `await` it (a common gotcha), keep registration fully synchronous - build the tool (construct a client + schema, no I/O) and register inline. Any network call happens later inside a tool `execute` or CLI action, where async is expected.

## 8. SDK handling and attribution

Use the official `apify-client` SDK (JS or Python), not raw HTTP. Construct the client once, memoized, and rebuilt only when the token changes. Stamp the attribution header on every request: `x-apify-integration-platform: <your-harness>`. When the request is driven by the AI tool (always, in this shape), also send `x-apify-integration-ai-tool: true`. This is the single most important line for Apify's side of the relationship.

**Compatibility shim:** SDK versions return a mix of Pydantic models and plain dicts, and Pydantic models expose only **snake_case** attributes even when the JSON is **camelCase**. Route *all* response reads through a small `_attr(obj, key, default)` helper that handles either shape. Direct `.attr` / `["key"]` access will silently return defaults on a mismatch.

## 9. Host integration gotchas

- **Entry-point loader semantics:** verify how the harness's loader resolves the plugin entry-point string before writing the packaging line. Some loaders expect a bare module (then `getattr(result, "register")`); others expect `"module:attr"`. Copying the wrong form silently fails to load. Document it with a long comment.
- **Schema validator constraints:** many harness validators reject `anyOf` / `oneOf` / `allOf`. Use a string enum for any discriminated `action` field, `Optional(...)` for optionals (never a nullable union), and a flat `Record(string, unknown)` for `input` (the Actor's real schema is only knowable after a `discover` call). A discriminated `action` plus optional sibling fields is the only shape the validator accepts.
- **Inlined utilities:** if the harness's plugin SDK does not export small helpers (error types, secret normalization, content wrapping), inline stable copies rather than deep-importing internals. Internal file layouts change frequently; deep imports couple the plugin to them. Accept the trade-off that upstream bug fixes won't track.

## 10. Actor ID format: tilde, not slash

Use `username~actor-name` everywhere an Actor ID appears: tool descriptions, `discover` results, `start`/`collect` payloads. The REST API uses `/` as a path delimiter, so a slash-separated ID in a URL is ambiguous. The tilde form is unambiguous and what the SDK and Store APIs accept directly. Build slugs in this form so the agent can pass them straight through to `start` without transformation.

## 11. Dependency injection for tests

The tool factory should accept an optional injected `client`. When omitted, construct a real client from the resolved key; when provided (in tests), bypass it entirely. This lets the test suite exercise every action and edge case - store search, schema fetch, run start, collect success/pending, unknown action, missing key - with no network access, using a hand-rolled mock shaped to the SDK's method-chain surface. No mocking framework needed.

## 12. Known gaps to design for

1. **Bill caps in the prompt, not the tool.** If `start` forwards only the Actor's `input` with no options channel, there is no `maxTotalChargeUsd` / `maxItems` cap plumbed through. The cost rule is enforced in the prompt via the README/pricing info `discover` returns. This is a known gap vs the MCP and REST paths - worth closing if the harness exposes an options argument.
2. **Poll vs webhook.** `collect` is an LLM-driven poll loop; long-running Actors mean multiple round-trips. A webhook-backed `collect` would be cheaper but requires the harness to expose a callback surface.
3. **Account-free discovery.** If the harness's `check_fn` gates all tools on a token, `discover` requires an account even for research. Consider giving `discover` a separate, looser check so users can browse before connecting.
4. **Surface scope.** Only the basic run-start -> poll -> fetch-dataset flow is exposed. Standby runs, Tasks, and schedules may be out of scope for v0.1 - document the boundary.

## Definition-of-done checklist

- [ ] Fixed, small set of composable tools (`discover` / `start` / `collect`) registered; dynamic list only if the harness truly supports it.
- [ ] Two-phase async: `start` returns refs, `collect` polls; no blocking on long runs.
- [ ] Tool description carries known-actors list, batching instruction, and delegation directive.
- [ ] Dataset output is untrusted-content fenced, size-capped, and marker-sanitized.
- [ ] Errors are returned as data, never raised; partial batch failures are per-item.
- [ ] Setup command verifies the token, reuses host config-merge, and has a manual fallback.
- [ ] Attribution headers (`-platform` and `-ai-tool`) are set on the client.
- [ ] All SDK response reads go through a compatibility shim.
- [ ] Entry-point loader semantics verified; `register()` is synchronous if the loader does not await.
- [ ] Schema uses string enums + `Optional`, no `anyOf`/`oneOf`; `input` is a record.
- [ ] Actor IDs use the tilde form in all user/agent-facing surfaces.
- [ ] Tool factory accepts an injected client; tests run with no network.
- [ ] Known gaps (bill caps, webhook, account-free discovery) are documented, not hidden.