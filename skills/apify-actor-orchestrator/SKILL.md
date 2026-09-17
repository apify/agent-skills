---
name: apify-actor-orchestrator
description: Orchestrate multiple Apify Actors into pipelines and workflows - chain Actor runs, pass data between them, handle failures, and build complex automation sequences. Use when coordinating multiple Actors, building ETL pipelines, or creating multi-step scraping and data processing workflows.
---

# Apify Actor Orchestrator

Build **multi-Actor workflows** that chain runs, pass data between steps, handle failures, and coordinate complex automation sequences on the Apify platform.

## Prerequisites

This skill extends two main capabilities that you should be familiar with from other skills:
1. Developing of new Actors (see `apify-actor-development` skill) 
  - Template selection, implementation, testing, deployment and maintenance of new Actors
2. Running existing Actors (see `apify-ultimate-scraper` skill)
  - Understanding Actor input/output, observing log and status and fetching results from the output

## Orchestration patterns

### Sequential pipeline

Run Actors one after another, passing output from one as input to the next:

1. Run Actor A with initial input
2. Wait for Actor A to finish, collect its dataset
3. Use Actor A's output as input for Actor after processing (e.g., filtering, transforming)
4. Repeat until the pipeline completes

### Parallel fan-out / fan-in

Run multiple Actors concurrently, then aggregate results:

1. Split work into independent chunks
2. Start multiple runs in parallel
3. Wait for all runs to complete
4. Merge/deduplicate/aggregate results from all runs

### Conditional branching

Route data to different Actors based on intermediate results:

1. Run an initial Actor
2. Inspect output to determine the next step
3. Branch to different Actors based on conditions

### Must have features
- Persist state about each called Actor. If the orchestrator is restarted, it should not rerun started runs.
  - Use `useState` function to keep one state object. It persists the state on server migration or abort automatically.
- Handle maximum account memory and concurrent runs limits.
  - When hitting limit, the best practice is to wait few seconds and retry, rather than failing the orchestrator run. Only fail if it seems we are deadlocked.
  - Hitting account memory limit throw with `error.type === 'actor-memory-limit-exceeded'`
  - Hitting concurrent runs limit throw with `error.type === 'concurrent-runs-limit-exceeded'`
- Propagate and distribute max total run USD 
  - Each Actor run has optional `maxTotalChargeUsd` option.
  - If the orchestrator has `maxTotalChargeUsd` set, it should distribute the remaining budget to each Actor run. E.g. if the workflow calls 3 Actors and orchestrator has $10 budget, it can start the first Actor with `maxTotalChargeUsd: 6`, second $3 and third $1. It doesn't need to decide upfront, it can adjust the limits based on results of previous steps. The actual cost of a run can be smaller than the `maxTotalChargeUsd` option. The overall cost of all Actor runs must not exceed the orchestrator's `maxTotalChargeUsd`.
- Graceful abort ('aborting' event) of the orchestrator should gracefully abort all child runs. If the orchestrator is resurrected, it should resurrect the aborted child runs as well. All published Actors are expected to be resumable. You can increase the `maxTotalChargeUsd` during resurrection but changing input might or might not work (Actors are not expected to handle changing input on resurrection).

## Best practices

- Use `fields` option when fetching items from datasets.
- Orchestrator itself should run with minimal memory, ideally 128 MB. It is running for the entirety of the workflow and should not cost much.
  - That requires offloading heavy data processing to `lukaskrivka/dedup-datasets-limited-permissions` Actor which is optimized for fast parallel processing and resumability. If the processing loads up to tens of MBs, it can still be done inside the orchestrator.
- After you decide which Actors to load, fetch input and output schemas of each Actor. Also try the Actors in small scale to validate the output. Only then write the transformations between one run's output and the next run's input.
- You don't need to fill up all available account memory so the user can run other Actors in parallel. Choose concurrency that serves the current user quickly but doesn't need to max out the account memory.
- Basic single run loop should look like:
  - `run = await client.actor(actorId).start(input, options)`
  - `state.thisActorRunId = run.id`
  - `await client.run(run.id).waitForFinish()`



