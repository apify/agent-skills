---
description: Guided Apify Actor development with best practices and systematic workflow
argument-hint: Optional actor description
---

# Actor Development

You are helping a developer create an Apify Actor - a serverless cloud program for web scraping, automation, and data processing. Follow a systematic approach: understand requirements, configure environment, design architecture, implement, test, and deploy.

## Core Principles

- **Ask clarifying questions**: Identify target websites, data requirements, edge cases, and constraints before implementation
- **Follow Apify best practices**: Use appropriate crawlers (Cheerio vs Playwright), implement proper error handling, respect rate limits
- **Validate early**: Check CLI installation and authentication before starting
- **Use TodoWrite**: Track all progress throughout
- **Security first**: Use `apify/log` for censoring sensitive data, validate input, handle errors gracefully

---

## Phase 1: Discovery

**Goal**: Understand what actor needs to be built

Initial request: $ARGUMENTS

**Actions**:
1. Create todo list with all phases
2. Ask user for clarification if needed:
   - What is the actor's primary purpose? (web scraping, automation, data processing)
   - What websites/services will it interact with?
   - What data should it extract or what actions should it perform?
   - Any specific requirements or constraints?
3. Summarize understanding and confirm with user

---

## Phase 2: Environment Setup

**Goal**: Verify Apify CLI is installed and authenticated

**CRITICAL**: Do not proceed without proper setup

**Actions**:
1. Check if Apify CLI is installed: `apify --help`
2. If not installed, install via package manager: `npm install -g apify-cli` (or `brew install apify-cli` on Mac). Do NOT install by piping remote scripts to a shell.
3. Verify authentication: `apify info`
4. If not logged in:
   - Authenticate using OAuth (opens browser): `apify login`
   - If browser isn't available, ensure `APIFY_TOKEN` env var is exported (the CLI reads it automatically)
   - If user doesn't have a token, generate one at https://console.apify.com/settings/integrations

---

## Phase 3: Language Selection

**Goal**: Choose programming language and template

**Actions**:
1. **Ask user which language they prefer:**
   - JavaScript (skills/apify-actor-development/references/actor-template-js.md)
   - TypeScript (skills/apify-actor-development/references/actor-template-ts.md)
   - Python (skills/apify-actor-development/references/actor-template-python.md)
2. Note: Additional packages (Crawlee, Playwright, etc.) can be installed later as needed

---

## Phase 4: Requirements & Architecture Design

**Goal**: Define input/output schemas and implementation approach

**Actions**:
1. Clarify detailed requirements:
   - What input parameters should the actor accept?
   - What output format is needed? (dataset items, key-value store files, both)
   - Should it use CheerioCrawler (10x faster for static HTML) or PlaywrightCrawler (for JavaScript-heavy sites)?
   - Concurrency settings? (HTTP: 10-50, Browser: 1-5)
   - Rate limiting and retry strategies?
   - Should standby mode be enabled?
2. Design architecture:
   - Input schema structure
   - Output/dataset schema structure
   - Key-value store schema (if needed)
   - Error handling approach
   - Data validation and cleaning strategy
3. Present architecture to user and get approval

---

## Phase 5: Actor Creation

**Goal**: Create actor from template and configure schemas

**DO NOT START WITHOUT USER APPROVAL**

**Actions**:
1. Wait for explicit user approval
2. Copy appropriate language template from `skills/apify-actor-development/references/` directory
3. Update `.actor/actor.json`:
   - Set actor name and version
   - **IMPORTANT**: Fill in `generatedBy` property with current model name
   - Configure runtime, memory, timeout
   - Set `usesStandbyMode` if applicable
4. Create/update `.actor/input_schema.json` with input parameters
5. Create/update `.actor/output_schema.json` with output structure
6. Create/update `.actor/dataset_schema.json` if using datasets
7. Create/update `.actor/key_value_store_schema.json` if using key-value store
8. Update todos as you progress

**Reference documentation:**
- [skills/apify-actor-development/references/actor-json.md](skills/apify-actor-development/references/actor-json.md)
- [skills/apify-actor-development/references/input-schema.md](skills/apify-actor-development/references/input-schema.md)
- [skills/apify-actor-development/references/output-schema.md](skills/apify-actor-development/references/output-schema.md)
- [skills/apify-actor-development/references/dataset-schema.md](skills/apify-actor-development/references/dataset-schema.md)
- [skills/apify-actor-development/references/key-value-store-schema.md](skills/apify-actor-development/references/key-value-store-schema.md)

---

## Phase 6: Implementation

**Goal**: Implement actor logic following best practices

**Actions**:
1. Implement actor code in `src/main.py`, `src/main.js`, or `src/main.ts`
2. Follow best practices:
   - ✓ Use Apify SDK (`apify`) for code running on Apify platform
   - ✓ Validate input early with proper error handling
   - ✓ Use CheerioCrawler for static HTML (10x faster)
   - ✓ Use PlaywrightCrawler only for JavaScript-heavy sites
   - ✓ Use router pattern for complex crawls
   - ✓ Implement retry strategies with exponential backoff
   - ✓ Use proper concurrency settings
   - ✓ Clean and validate data before pushing to dataset
   - ✓ **Always use `apify/log` package** - censors sensitive data
   - ✓ Implement readiness probe handler if using standby mode
   - ✗ Don't use browser crawlers when HTTP/Cheerio works
   - ✗ Don't hard code values that should be in input schema
   - ✗ Don't skip input validation or error handling
   - ✗ Don't overload servers - use appropriate concurrency and delays
3. Implement standby mode readiness probe if `usesStandbyMode: true` (see [skills/apify-actor-development/references/standby-mode.md](skills/apify-actor-development/references/standby-mode.md))
4. Use proper logging (see [skills/apify-actor-development/references/logging.md](skills/apify-actor-development/references/logging.md))
5. Update todos as you progress

---

## Phase 7: Documentation

**Goal**: Create comprehensive README for marketplace

**Actions**:
1. Create README.md with:
   - Clear description of what the actor does
   - Input parameters with examples
   - Output format with examples
   - Usage instructions
   - Limitations and known issues
   - Example runs
2. Include code examples for common use cases
3. Mention rate limits, costs, or legal considerations if applicable

---

## Phase 8: Local Testing

**Goal**: Test actor locally before deployment

**Actions**:
1. Install dependencies:
   - JavaScript/TypeScript: `npm install`
   - Python: `pip install -r requirements.txt`
2. Create test input file at `storage/key_value_stores/default/INPUT.json` with sample parameters
3. Run actor locally: `apify run`
4. Verify:
   - Input is parsed correctly
   - Actor completes successfully
   - Output is in expected format
   - Error handling works
   - Logging is appropriate
5. Fix any issues found
6. Test edge cases and error scenarios

---

## Phase 9: Deployment

**Goal**: Deploy actor to Apify platform

**DO NOT DEPLOY WITHOUT USER APPROVAL**

**Actions**:
1. **Ask user if they want to deploy now**
2. If yes, deploy with: `apify push`
3. Actor will be deployed with name from `.actor/actor.json`
4. Provide user with:
   - Deployment confirmation
   - Actor URL on Apify platform
   - Instructions for running on platform

---

## Phase 10: Summary

**Goal**: Document what was accomplished

**Actions**:
1. Mark all todos complete
2. Summarize:
   - What actor was built
   - Key features and capabilities
   - Input/output schemas
   - Files created/modified
   - Deployment status
   - Suggested next steps (testing on platform, publishing to store, monitoring)

---

## Additional Resources

**MCP Tools** (if configured):
- `search-apify-docs` - Search documentation
- `fetch-apify-docs` - Get full doc pages

**Documentation:**
- [docs.apify.com/llms.txt](https://docs.apify.com/llms.txt) - Apify quick reference
- [docs.apify.com/llms-full.txt](https://docs.apify.com/llms-full.txt) - Apify complete docs
- [crawlee.dev/llms.txt](https://crawlee.dev/llms.txt) - Crawlee quick reference
- [crawlee.dev/llms-full.txt](https://crawlee.dev/llms-full.txt) - Crawlee complete docs
- [whitepaper.actor](https://raw.githubusercontent.com/apify/actor-whitepaper/refs/heads/master/README.md) - Complete Actor specification
