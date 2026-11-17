---
name: apify-fix-git-connection
description: Repair an Apify Actor's broken Git connection - pushes to GitHub that no longer start a build, builds that fail to clone the repository, or a GitHub integration rejected as invalid or expired (for example after Apify API tokens were revoked). Use when a Git-sourced Actor stopped deploying from its repository.
---

# Fix an Actor's Git connection

A Git-sourced Actor deploys through two links, and each one breaks on its own:

- **Clone**: Apify reads the repository when it builds.
- **Trigger**: a push to the repository starts that build.

Diagnose both links, repair the broken ones, then prove the chain with one push. Runs keep using the last successful build the whole time, so the Actor stays up while you work.

The steps use the Apify CLI (`apify login` first) and the GitHub CLI (`gh`). They are written for GitHub; GitLab and Bitbucket have the same two links behind different commands and screens.

Two rules hold in every step:

- **Ask before a deploy.** A successful build moves the version's build tag (usually `latest`) to the head of the branch, so starting a build and pushing a commit are both deploys. Get the user's go-ahead for each.
- **Tokens stay with the user.** A webhook URL embeds an Apify API token. Print only its host, as the commands below do, and judge a delivery by its status code: its response body repeats the URL. The user performs every step that handles a key, a token or that URL.

## 1. Find the Git version

```bash
apify api GET '/v2/actors/<username>~<actor-name>'
apify api GET '/v2/actors/<username>~<actor-name>/builds?desc=true&limit=5'
```

In `versions`, take the entry with `sourceType: "GIT_REPO"` and note its `versionNumber`, `gitRepoUrl` and `buildTag`. In `taggedBuilds`, note the build that tag points at. An Actor with no `GIT_REPO` version deploys with `apify push` and is outside this skill.

Done when you can name the version, its repository URL, and the build that is live.

## 2. Diagnose the clone link

Read the log of the newest build of that version:

```bash
apify api GET '/v2/actor-builds/<buildId>/log'
```

| Log line                                | Clone link |
| --------------------------------------- | ---------- |
| `Cloned commit ID: <sha>`               | Works      |
| `Could not read from remote repository` | Broken     |

A build from before the trouble started proves nothing. In that case start a fresh one (a deploy) and read its log:

```bash
apify api POST '/v2/actors/<username>~<actor-name>/builds?version=<versionNumber>'
```

Done when a build newer than the trouble shows one of the two lines.

## 3. Diagnose the trigger link

```bash
gh api repos/<owner>/<repo>/hooks --jq '.[] | {id, active, events, host: (.config.url | split("/")[2]), last_response_code: .last_response.code}'
gh api 'repos/<owner>/<repo>/hooks/<hookId>/deliveries?per_page=5' --jq '.[] | {delivered_at, event, status_code}'
```

An Apify webhook has the host `console-backend.apify.com` (registered by Apify's GitHub App) or `api.apify.com` (a Build Actor webhook added by hand).

| What the repository shows                     | Trigger link                                                  |
| --------------------------------------------- | ------------------------------------------------------------- |
| One Apify webhook, latest `push` delivery 2xx | Works                                                         |
| Latest `push` delivery 400 or 401             | Broken: Apify rejects the token in the webhook URL            |
| No Apify webhook                              | Broken: nothing starts a build                                |
| Two Apify webhooks answering 2xx              | Works, but every push starts two builds: the user deletes one |

Done when every Apify webhook on the repository is in one row of the table.

## 4. Repair the clone link

A private repository needs the SSH form of the Git URL plus the Actor's deployment key. The user does this:

1. In Apify Console, open the Actor's **Source** tab and select the Git version in **Version**.
2. Set **Git URL** to `git@github.com:<owner>/<repo>.git` and save. The HTTPS form only clones public repositories.
3. Click the **deployment key** link below the URL field and copy the key.
4. On GitHub, open the repository's **Settings > Deploy keys > Add deploy key**, paste the key, leave **Allow write access** unchecked, and save.

Confirm the key with `gh api repos/<owner>/<repo>/keys --jq '.[] | {title, read_only, created_at}'`, then start a build (step 2) and read its log.

Done when a build log shows `Cloned commit ID` with the head of the branch.

## 5. Repair the trigger link

First let Apify register the webhook itself:

```bash
apify api PUT '/v2/actors/<username>~<actor-name>/versions/<versionNumber>/build-on-push' -d '{"providerId":"github-app","enabled":true}'
```

- **No error**: automatic builds are on. Have the user delete any older Apify webhook that still fails, then go to step 6.
- **`invalid-git-auth-token`**: Apify's GitHub authorization is dead. Use a Build Actor webhook instead; it depends only on the clone link.

For the Build Actor webhook, the user does this:

1. In Apify Console, open **Settings > API & Integrations** and select **Create a new token**. Name it after the webhook, for example `GitHub build webhook for <repo>`, and copy its value: Console shows a token's value once, at creation, so an existing token cannot be reused here.
2. On the Actor page, open **API > API endpoints**, select the new token in the token dropdown, and copy the **Build Actor** URL.
3. Check that the URL has `token=<the new token>` and `version=<versionNumber>`, and delete `waitForFinish` from it: GitHub gives a webhook 10 seconds to answer, less than a build takes.
4. On GitHub, open the repository's **Settings > Webhooks > Add webhook**. Paste the URL into **Payload URL**, set **Content type** to `application/json`, keep **Just the push event**, and save.
5. On the same page, delete every other Apify webhook.

Adding the webhook makes GitHub send a `ping`, which starts one build: a deploy, so tell the user before step 4, and expect that build in step 6.

Done when the listing from step 3 shows exactly one active Apify webhook.

## 6. Prove the chain with one push

Push one commit to the branch the version builds from: the default branch, or the one after `#` in `gitRepoUrl`. An empty commit is enough:

```bash
git commit --allow-empty -m "Trigger build to test the build webhook"
git push
```

Then check all four:

- The webhook has one new `push` delivery with a 2xx status.
- Exactly one build started after the push.
- That build's log shows `Cloned commit ID` equal to the pushed commit.
- `taggedBuilds.<buildTag>` points at that build.

Done when all four hold. A failed check sends you back to the step for its link: the first two to the trigger link, the last two to the clone link.

Close by telling the user that a Build Actor webhook carries the API token they created for it: when that token is rotated, deleted or expires, pushes stop building without any notice, and the cure is step 5 again.
