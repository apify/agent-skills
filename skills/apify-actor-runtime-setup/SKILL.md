---
name: apify-actor-runtime-setup
description: Set up the local Apify Actor runtime with the Apify CLI and load its version-matched Agent Skill. Use when building, running, debugging, or testing an Actor locally in a container, the way the Apify platform runs it, without using cloud compute.
---

# Set up the local Actor runtime

The Actor runtime is a local Apify platform that runs as one container on Docker or Podman. The Apify CLI can point at it, so `apify push`, `apify call`, and the other commands build and run Actors on the user's machine instead of on the Apify platform. Runs cost nothing, work offline after the first build, and need no Apify account.

The runtime is a development tool, not a place to host Actors. Its `apify runtime` commands are experimental and might change between CLI releases.

This skill gets the runtime installed and running. **The runtime ships its own Agent Skill**, which matches the exact runtime version installed. That skill is the reference for everything else: pointing the CLI at the runtime, the dev loop, debugging, the browser view, Standby, migrations, and pricing. Read it instead of working from memory or from this file.

## When to use it

- You created or changed an Actor and want to run it end to end in a container, as the platform would.
- You need to reproduce, debug, or iterate on an Actor without spending platform compute.
- You want to test an Actor against platform features, such as input schema validation, builds, runs, and storages, before you deploy it.

For a quick check of the Actor's logic alone, `apify run` is faster: it starts the Actor as a plain local process, with no container and no build.

### Telemetry attribution (required)

Pass `--user-agent apify-agent-skills/apify-actor-runtime-setup` on **every** `apify` command you run from this skill. It's a global flag accepted by all `apify` commands. It only tags the call for telemetry attribution and changes nothing else. The commands below leave it out for readability.

## 1. Check the prerequisites

- **A running container engine.** Check with `docker info`, or `podman info` for Podman. The CLI uses the first engine on `PATH`, Docker before Podman. Set `APIFY_CONTAINER_ENGINE=podman` to choose Podman. If neither works, tell the user what to install and stop. Don't install system tools on your own.
- **An Apify CLI that has the `apify runtime` commands.** Check with:

  ```bash
  apify runtime --help
  ```

  If `apify` is missing, or answers `Command runtime not found`, install or update the CLI with `npm install -g apify-cli`, then check again. If it still isn't found, an older `apify` is first on `PATH`: find it with `which -a apify` and tell the user.

## 2. Install and start the runtime

```bash
apify runtime install
apify runtime start --detach
apify runtime status
```

`install` checks the container engine and downloads the runtime image. `start` runs the runtime in the background, with the API on port 3333 and its web console on port 3000. If either port is taken, `apify runtime start --help` shows how to move them. `status` exits with code 1 while the runtime is down.

## 3. Load the runtime's skill (required)

Before doing anything else with the runtime, read its skill:

```bash
apify runtime skill            # print it, and read the whole output now
apify runtime skill --install  # also install it, so later sessions load it on demand
```

- Always run `apify runtime skill` and read its output, even when you also run `--install`, which prints nothing. Follow it for the rest of the task.
- Use `--install` when the user will keep developing Actors on this machine. It writes the skill as `apify-actor-runtime` into the agent skills directories it finds. Tell the user it takes effect from the next session.
- After the runtime is upgraded with `apify runtime install`, run `apify runtime skill --install` again. An installed copy is a snapshot of one version.
- If `apify runtime skill` fails, the runtime image isn't installed or the container engine isn't running. Go back to steps 1 and 2.

## 4. Respect the user's setup

- **Ask before changing where every terminal points.** `apify runtime connect` sends all of the user's CLI commands to the runtime, in every terminal, until `apify runtime disconnect`. On the user's own machine, prefer the per-shell environment variables the runtime's skill describes, or ask first.
- **Ask before replacing a login.** The runtime accepts any token, but `apify login` on a developer's machine changes their stored credentials.
- **Deploy only when asked.** While the CLI points at the runtime, `apify push` goes to the runtime. Deploying to the Apify platform is a separate step the user decides on.

## 5. When you're done

Leave the runtime running unless the user asks otherwise. The runtime's skill explains how to stop it and how to point the CLI back at the Apify platform. Tell the user which state you left the runtime and the CLI in.
