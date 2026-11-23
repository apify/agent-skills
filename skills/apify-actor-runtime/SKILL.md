---
name: apify-actor-runtime
description: Test and develop Apify Actors on a local Actor runtime instead of the Apify platform - install it via the Apify CLI, then load its version-matched skill with apify runtime skill. Use when building, running, debugging or testing an Actor locally.
---

# Local Actor runtime

The Actor runtime is a local Apify platform that runs in one container. The standard Apify CLI can
point at it, so `apify push`, `apify call` and the other commands run on your machine rather than on
the Apify platform. Runs are free, work offline, and by default never touch a real Apify account.
Use it whenever you write or change an Actor and want to run it for real before shipping. The
`apify runtime` commands are experimental and might change between CLI releases.

This skill only covers getting the runtime installed; the runtime's own skill covers the rest.
**The runtime ships its own Agent Skill**, which matches the exact runtime version installed. That
skill is the reference for everything you do with the runtime: dev loop, debugging, the browser
view, Standby, migrations, pricing, and so on. Don't guess at those from memory or from this file.
Read the runtime's skill.

### Telemetry attribution (required)

Pass `--user-agent apify-agent-skills/apify-actor-runtime` on **every** `apify` command you run from
this skill. It is a global flag accepted by all `apify` commands; it only tags the call for telemetry
attribution and changes nothing else. The commands below leave it out for readability.

## When to use it

- You created or changed an Actor and want to run it end to end.
- You need to reproduce, debug or iterate on an Actor's behaviour without spending platform compute.
- You want to test the Actor against platform features (storages, builds, runs, events) locally.

Don't use it to host Actors. It is a development tool.

## 1. Check the prerequisites

- **A container engine that is running**: Docker or Podman. Check with `docker info` (or `podman info`).
  If neither is available, tell the user what to install and stop. Don't install system tools silently.
- **Apify CLI 1.14.0 or later**, the first release with the `apify runtime` commands:

  ```bash
  apify --version
  apify runtime --help
  ```

  If the CLI is older, run `apify upgrade`, which updates it the same way it was installed. If `apify`
  is missing, install it with `npm install -g apify-cli`. If `apify runtime` still answers
  `Command runtime not found`, an older `apify` is first on `PATH` (`which -a apify`). Tell the user
  rather than removing it.

## 2. Install and start the runtime

```bash
apify runtime install
apify runtime start --detach
apify runtime status
```

If a default port is already taken, `apify runtime start --help` shows how to move it.

## 3. Load the runtime's skill (required)

Before doing anything else with the runtime, get its skill:

```bash
apify runtime skill            # print it and read it now
apify runtime skill --install  # install it instead of printing, so later sessions load it on demand
```

- Always run `apify runtime skill` and read its whole output, even if you also run `--install`
  (which does not print anything). Then follow it for the rest of the task. It explains how to point
  the CLI at the runtime, authenticate, push, run and inspect Actors.
- Use `--install` when the user will keep developing Actors on this machine. It installs the skill as
  `apify-actor-runtime` in the agent skills directories, replacing this setup skill where both share a
  directory. Tell the user it takes effect from the next session.
- After the runtime is upgraded (`apify runtime install` again), run `apify runtime skill --install`
  again. An installed copy is a snapshot of one version.
- If `apify runtime skill` fails, the runtime image isn't installed or the container engine isn't
  running. Check step 1, then step 2.

## 4. When you're done

Leave the runtime running unless the user asks otherwise. The runtime's skill explains how to stop it,
and how to point the CLI back at the Apify platform. Tell the user which state you left the CLI in.
