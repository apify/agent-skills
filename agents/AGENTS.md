<skills>

You have additional SKILLs documented in directories containing a "SKILL.md" file.

These skills are:
 - apify-actor-development -> "skills/apify-actor-development/SKILL.md"
 - apify-actor-runtime -> "skills/apify-actor-runtime/SKILL.md"
 - apify-actorization -> "skills/apify-actorization/SKILL.md"
 - apify-api-to-server-actor -> "skills/apify-api-to-server-actor/SKILL.md"
 - apify-fix-git-connection -> "skills/apify-fix-git-connection/SKILL.md"
 - apify-integration-development -> "skills/apify-integration-development/SKILL.md"
 - apify-ultimate-scraper -> "skills/apify-ultimate-scraper/SKILL.md"

IMPORTANT: You MUST read the SKILL.md file whenever the description of the skills matches the user intent, or may help accomplish their task.

<available_skills>

apify-actor-development: `Create, modify, debug, and deploy Apify Actors, and write their input and output schemas. Use when building an Actor from scratch, changing or troubleshooting Actor code, generating or updating .actor schema files, or pushing an Actor to the Apify platform. To wrap an existing non-Actor project, use apify-actorization instead.`
apify-actor-runtime: `Test and develop Apify Actors on a local Actor runtime instead of the Apify platform - install it via the Apify CLI, then load its version-matched skill with apify runtime skill. Use when building, running, debugging or testing an Actor locally.`
apify-actorization: `Convert existing projects into Apify Actors - serverless cloud programs. Actorize JavaScript/TypeScript (SDK with Actor.init/exit), Python (async context manager), or any language (CLI wrapper). Use when migrating code to Apify, wrapping CLI tools as Actors, or adding Actor SDK to existing projects.`
apify-api-to-server-actor: `Turn an existing HTTP API into an Apify Server Actor that works as a thin, pay-per-call wrapper around it, so a company can sell its API on Apify Store as a distribution channel. Reads the API's endpoints (OpenAPI spec or docs) and its pricing page, maps the upstream price of each call to Apify pay-per-event events, and produces a tested Actor project with per-request charging, endpoint schema, README, pricing file and a launch plan. Use whenever someone wants to wrap, proxy, resell, list or publish a third-party or partner API (REST, SaaS, data or AI API) as an Apify Actor, Server Actor or Standby Actor, asks how to price API calls with Actor events or match an API's pricing on Apify, or wants to bring a partner's product to Apify Store, even if they do not say "Server Actor". Not for scrapers or other Actors (use apify-actor-development), and not for wrapping an MCP server (use the ts-mcp-proxy or python-mcp-proxy template).`
apify-fix-git-connection: `Repair an Apify Actor's broken Git connection - pushes to GitHub that no longer start a build, builds that fail to clone the repository, or a GitHub integration rejected as invalid or expired (for example after Apify API tokens were revoked). Use when a Git-sourced Actor stopped deploying from its repository.`
apify-integration-development: `Design and build an official Apify integration for a company's product - workflow-automation apps (Zapier/n8n-style), AI agent plugins (coding-agent skills+MCP bundles or OpenClaw/Hermes-style harnesses), AI framework packages (LangChain/LlamaIndex-style), or direct application clients via apify-client. Use when planning, creating, or reviewing an integration that exposes Apify Actors, runs, datasets, or key-value stores inside another product.`
apify-ultimate-scraper: `Universal AI-powered web scraper for any platform. Scrape data from Instagram, Facebook, TikTok, YouTube, LinkedIn, X/Twitter, Google Maps, Google Search, Google Trends, Reddit, Airbnb, Yelp, and 15+ more platforms. Use for lead generation, brand monitoring, competitor analysis, influencer discovery, trend research, content analytics, audience analysis, review analysis, SEO intelligence, recruitment, or any data extraction task.`
</available_skills>

Paths referenced within SKILL.md files are relative to that SKILL folder. For example `reference/workflows.md` refers to the workflows file inside the skill's reference folder.

</skills>
