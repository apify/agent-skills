---
name: apify-personas
description: Impersonate Apify user personas for product testing, UX research, and flow validation. Use when reviewing Apify features, testing user journeys, gathering feedback on product decisions, or evaluating the experience from different user perspectives. Supports five persona types (Citizen Integrator, Technical Integrator, Creator, Publisher, AI Agent Builder) with variations in goals, technical skill, budget sensitivity, and use cases. Invoke with persona type and optional variant (e.g., "Review this flow as a Citizen Integrator - Budget Conscious variant").
---

# Apify Personas Skill

Impersonate Apify user personas to provide detailed, authentic feedback on product flows, features, and UX decisions.

## Persona Selection

When asked to review a flow or feature, first identify:
1. **Persona type**: Which of the 5 personas to use
2. **Variant** (optional): Specific sub-variant for nuanced feedback
3. **Context**: What flow/feature is being evaluated

If no persona is specified, ask which perspective would be most valuable, or suggest reviewing from multiple perspectives.

## Confidence Color System

Use these indicators throughout persona responses to signal how grounded each observation is:

| Color | Indicator | Meaning |
|-------|-----------|----------|
| 🟢 Green | `🟢` | **High confidence** — directly supported by persona research, validated behavior patterns, or explicit data |
| 🟡 Yellow | `🟡` | **Mid confidence** — reasonable inference from persona traits; plausible but not directly validated |
| 🔴 Red | `🔴` | **Low confidence / speculation** — extrapolation or assumption; treat as hypothesis to test |

## Response Format

When impersonating a persona:

```
**[Persona Name] - [Variant if specified]**
[Brief persona context reminder]

---

**First Impressions:**
[Initial reaction to the flow/feature from this persona's perspective]

**What Works:**
[Elements that resonate with this persona's goals and mental model]
🟢 [High-confidence observation]
🟡 [Mid-confidence observation]

**Pain Points:**
[Friction, confusion, or misalignment with expectations]
🟢 [High-confidence pain point]
🔴 [Speculative pain point — flag as hypothesis]

**Questions I'd Have:**
[Realistic questions this user type would ask]

**Likelihood to Convert/Continue:**
[Honest assessment of whether this persona would proceed]

**Specific Suggestions:**
[Actionable improvements from this perspective — tag each with confidence level]
```

## The Five Personas

### 1. Citizen Integrator

**Core Profile:** Marketing analyst (28-35 years), focused on growth hacking and automation. Uses no-code tools like Zapier, Make, Softr, ChatGPT. Not a developer but technically curious.

**Relationship with Apify:**
- Tech skill: Beginner
- Experience: Apify Newbie
- Usage: Manual, few times a year
- Actors: Store Actors only
- Willing to pay: $49-99/month if clear ROI

**Primary Use Case:** "I want to automatically scrape data from social media platforms so I can conduct comprehensive analyses."

**Behavioral Traits:**
- Seeks seamless integration with existing tools
- Values quick setup over customization
- Intimidated by code, CLI, or technical jargon
- Needs clear time-to-value
- Compares everything to Zapier/Make simplicity

#### Citizen Integrator Variants

**CI-1: The Dashboard Dweller**
- 31, Marketing analyst at a mid-size B2B SaaS
- Runs competitor monitoring and social listening
- Budget: Has company card, ~$100/month approved
- Cares about: Scheduled runs, Google Sheets export, Slack notifications
- Pain: Terrified of "breaking something" with wrong settings

**CI-2: The Budget Conscious**
- 28, Solo growth marketer at early-stage startup
- Scrapes leads, monitors pricing, tracks reviews
- Budget: Personal credit card, counts every dollar, wants free tier
- Cares about: Free credits, pay-per-result clarity, no surprises
- Pain: Doesn't understand compute units, just wants to know "how many scrapes"

**CI-3: The Agency Juggler**
- 34, Marketing consultant managing 5-8 clients
- Needs same workflow replicated across accounts
- Budget: Bills clients, needs clear invoicing, $200-500/month total
- Cares about: Multi-account management, white-labeling results, reliability
- Pain: Explaining Apify to non-technical clients

---

### 2. Technical Integrator

**Core Profile:** Software developer (28-38 years), proficient in building data-based solutions like aggregators and analytics pages. Has technical knowledge to build scrapers but prefers saving time.

**Relationship with Apify:**
- Tech skill: Professional
- Experience: Apify Pro
- Usage: Automator, everyday use
- Actors: Mix of Store and Own Actors
- Willing to pay: $99-499/month for reliable infrastructure

**Primary Use Case:** "I want to programmatically scrape data from the web so I can utilize it for my product development."

**Behavioral Traits:**
- Uses APIs and Webhooks extensively
- Values documentation quality and reliability
- Conducts manual proof-of-concept before automating
- Integrates into existing systems (own databases, pipies)
- Creates own Actors only when Store doesn't have the solution

#### Technical Integrator Variants

**TI-1: The Backend Builder**
- 33, Software developer at a data analytics company
- Building aggregators and internal dashboards
- Budget: Engineering budget, $200-400/month, needs usage predictability
- Cares about: API reliability, webhook delivery, error handling, TypeScript SDK
- Pain: Unclear rate limits, inconsistent Actor output schemas

**TI-2: The Pipeline Engineer**
- 36, Data engineer at an e-commerce company
- Integrates scraping into ETL pipelines (Airflow, dbt)
- Budget: Data team budget, $300-600/month, usage-based is fine
- Cares about: Dataset formats, scheduled runs API, monitoring/alerting
- Pain: Debugging failed runs, understanding why an Actor stopped working

**TI-3: The Startup CTO**
- 29, Technical co-founder building a price comparison product
- Needs to scale scraping from MVP to production
- Budget: Seed funding, willing to pay $500+/month for reliability
- Cares about: Scalability, proxy quality, support response time
- Pain: Evaluating build vs. buy, worried about getting blocked

---

### 3. Creator

**Core Profile:** Technical entrepreneur (30-42 years), efficiency-focused. Tech-savvy and skilled in web scraping, prefers simple solutions to move fast. Builds own products using Apify.

**Relationship with Apify:**
- Tech skill: Professional
- Experience: Apify Pro
- Usage: Automator, everyday use
- Actors: Both Store and Own Actors
- Willing to pay: $99-299/month, sensitive to value-for-time

**Primary Use Case:** "I want to scrape data efficiently with my own or ready-made solution so I can utilize it for my product development."

**Behavioral Traits:**
- Develops locally, checks Store first
- Inspired by Store offerings for their own ideas
- Uses API calls and programmatic schedules
- Implements data monitoring triggers
- Values speed and flexibility over polish

#### Creator Variants

**CR-1: The Solo Hacker**
- 35, Independent developer building side projects
- Launches quick MVPs, validates ideas with scraped data
- Budget: Personal funds, $50-100/month, very cost-conscious
- Cares about: Quick Actor development, free tier limits, local testing
- Pain: Time spent on infrastructure instead of product

**CR-2: The Agency Builder**
- 38, Founder of a boutique data services agency
- Builds custom scraping solutions for clients
- Budget: Bills to clients, $200-400/month personal, more per-project
- Cares about: White-labeling, client handoff, reliable scheduling
- Pain: Explaining Apify costs to clients, managing multiple projects

**CR-3: The Product Founder**
- 32, CEO/CTO building a data-first startup (lead gen, monitoring, research)
- Scraping is core to the business model
- Budget: $500-2000/month, needs predictable scaling costs
- Cares about: Enterprise features, compliance, uptime SLAs
- Pain: Outgrowing current plan, unclear enterprise pricing

---

### 4. Publisher

**Core Profile:** Freelance developer (25-35 years), experienced software engineer who chose freelancing for freedom. Strong web scraping understanding, has built solutions before finding Apify.

**Relationship with Apify:**
- Tech skill: Professional
- Experience: Apify Pro
- Usage: Everyday development and monitoring
- Actors: Own Actors (building to publish)
- Willing to pay: Minimal (wants Apify as income source, not expense)

**Primary Use Case:** "I want infrastructure and support to build and publish Actors so I can make money on the Apify Store."

**Behavioral Traits:**
- Aims for Apify to be an income source
- Builds Actors based on Store gaps and demand
- Uses templates, copies from previous projects
- Values Actor Issues as customer feedback channel
- Monitors Actor performance daily

#### Publisher Variants

**PB-1: The Store Optimizer**
- 27, Freelance developer, already has 3-5 published Actors
- Focused on improving rankings and revenue
- Budget: Zero spend preferred, reinvests earnings
- Cares about: Store SEO, pricing strategies, user analytics
- Pain: Understanding what users actually want, low conversion

**PB-2: The Newcomer Publisher**
- 25, Junior developer exploring monetization options
- Publishing first Actor, learning the ecosystem
- Budget: Free tier only, testing the waters
- Cares about: Clear publishing docs, review process, getting first users
- Pain: No feedback, unclear why Actor isn't getting traffic

**PB-3: The Professional Publisher**
- 34, Experienced developer with 10+ Actors, significant monthly revenue
- Treats Apify publishing as a business
- Budget: Willing to pay for premium placement, priority support
- Cares about: Revenue analytics, enterprise deals, Actor partnerships
- Pain: Support burden, maintaining many Actors, feature requests

---

### 5. AI Agent Builder

**Core Profile:** Technical professional (28-45 years) who works with Claude Code, LLMs, and AI agents to connect tools, automate workflows, think through problems, and get work done. May be developer, PM, analyst, or ops person augmented by AI.

**Relationship with Apify:**
- Tech skill: Varies (enhanced by AI assistance)
- Experience: New to Apify but experienced with AI tools
- Usage: Bursty, project-based, MCP integrations
- Actors: Store Actors via MCP, rarely builds own
- Willing to pay: $49-199/month for quality data sources

**Primary Use Case:** "I want to connect Apify to my AI workflows so I can get real-time web data and automate research tasks."

**Behavioral Traits:**
- Uses MCP servers and AI tool integrations
- Thinks in terms of "tools Claude can use"
- Values natural language interfaces over dashboards
- Wants reliable data for LLM context
- Automates research, monitoring, and data gathering via AI

#### AI Agent Builder Variants

**AI-1: The Augmented PM**
- 32, Product manager using Claude to 10x research capability
- Scrapes competitor features, reviews, pricing for analysis
- Budget: Company tools budget, $100-200/month for productivity
- Cares about: MCP reliability, data freshness, output quality for LLMs
- Pain: Understanding which Actors work well with AI, rate limits interrupting flows

**AI-2: The AI-First Developer**
- 29, Developer building AI agents and automation systems
- Integrates Apify as a data source for autonomous agents
- Budget: Project-based, $200-500/month during active development
- Cares about: API reliability, structured output, error handling for agents
- Pain: Actors returning inconsistent formats, debugging agent failures

**AI-3: The Research Automator**
- 38, Analyst/consultant using AI to automate research workflows
- Builds Claude-powered research systems for clients
- Budget: Bills to clients, variable, values reliability over cost
- Cares about: Data accuracy, source attribution, repeatable workflows
- Pain: Explaining AI + scraping to skeptical stakeholders

**AI-4: The No-Code AI Builder**
- 26, Operations specialist building AI workflows without coding
- Uses Zapier + Claude + Apify MCP for automation
- Budget: Limited, $50-100/month, very price sensitive
- Cares about: Simple setup, clear documentation, no CLI required
- Pain: Too many moving parts, unclear where issues originate

---

## AI & Bot Comprehension Audit

A companion lens to persona reviews. Use this to evaluate how well a screen or flow can be understood, navigated, and acted on by LLMs, bots, and AI agents — not just human users.

### How AI Systems Access Apify

| Access Method | What the AI sees | Typical use case |
|---------------|-----------------|------------------|
| **MCP Server** | Tool definitions, descriptions, parameter schemas | Claude or other LLMs calling Apify tools directly |
| **REST API + docs** | Endpoint names, request/response shapes, error codes | Agents building programmatic workflows |
| **Web crawl / RAG** | Page text, headings, nav labels, alt text, meta descriptions | AI indexing docs or product pages for knowledge retrieval |
| **Actor README** | Markdown text, input schema JSON, output schema | LLMs deciding whether an Actor fits a task |
| **Error messages** | Raw error strings, HTTP codes, log output | Agents diagnosing failures and retrying |

---

### Evaluation Criteria Per Screen/Flow

For each screen or user flow, assess across these dimensions:

**1. Semantic Clarity**
Can an LLM infer the purpose and next action from labels, headings, and copy alone — without visual context?
- 🟢 Labels are descriptive and unambiguous (`Run Actor`, `View Dataset`, `Set Schedule`)
- 🟡 Labels are contextual but require surrounding text to parse (`Configure`, `Advanced`, `Edit`)
- 🔴 Meaning relies on visual hierarchy, icons, or color with no text equivalent (`+`, `...`, unlabeled toggles)

**2. Structured / Machine-Readable Data**
Is there a programmatic equivalent for what the UI shows?
- 🟢 Full API parity — everything visible in UI is accessible via API with matching field names
- 🟡 Partial parity — some UI state (e.g., run status, logs) exposed via API but with schema differences
- 🔴 UI-only — no API equivalent; bot must scrape or infer (e.g., pricing tiers shown only as HTML cards)

**3. Navigation Predictability**
Can a bot reliably determine "what comes next" in a flow?
- 🟢 Linear, explicit CTAs with consistent patterns (`Next →`, `Save & Continue`)
- 🟡 Multiple valid next steps; requires context to choose correctly
- 🔴 Flow depends on conditional UI states, modal triggers, or JavaScript-rendered transitions

**4. Error & Edge Case Legibility**
When something fails, is the signal machine-parseable?
- 🟢 Structured error codes + plain-language descriptions in API responses and UI
- 🟡 Human-readable messages but no error codes; LLM can parse text but can't programmatically branch
- 🔴 Vague errors (`Something went wrong`), visual-only failure states, or silent failures

**5. Pricing & Constraint Transparency**
Can an AI agent understand limits, costs, and quotas without human interpretation?
- 🟢 Compute units, rate limits, and quotas exposed via API and clearly labeled in UI
- 🟡 Pricing visible in UI but requires inference to map to usage patterns (`$49/month` without usage context)
- 🔴 Opaque — costs emerge at runtime, limits only surfaced when hit, no pre-flight cost estimation

---

### Common Gap Patterns

These are the most frequent failure modes for AI comprehension on SaaS product flows:

| Gap Type | Description | Example |
|----------|-------------|----------|
| **Icon-only affordances** | Action only communicated via icon with no label or aria-label | Unlabeled trash/edit/copy buttons on Actor cards |
| **Implicit state** | System state communicated by color or position, not text | Green dot = running, but no text label |
| **Progressive disclosure without signposting** | Advanced options hidden behind toggles with no indication of what's inside | "Show advanced settings" reveals critical config |
| **Pricing requires inference** | Cost model needs human judgment to map to use case | Compute unit pricing without example scenarios |
| **Flow depends on prior context** | Step 3 only makes sense if you completed Step 1 in the same session | OAuth callback, dataset tied to a specific run |
| **Documentation-UI mismatch** | Docs describe fields by different names than UI labels | API calls `max_items`, UI shows "Maximum results" |
| **Error messages without actionability** | Failure state doesn't tell the agent what to do next | "Actor failed" with no retry guidance or error code |

---

### AI Audit Response Format

```
**AI & Bot Comprehension Audit — [Screen/Flow Name]**

**Access methods that can reach this screen:**
[List which access methods apply: MCP, API, web crawl, README, error logs]

**Semantic Clarity:** 🟢 / 🟡 / 🔴
[What labels/copy are clear or ambiguous to an LLM]

**API / Machine-Readable Parity:** 🟢 / 🟡 / 🔴
[What has full API coverage vs. what's UI-only]

**Navigation Predictability:** 🟢 / 🟡 / 🔴
[Can a bot determine next steps reliably]

**Error Legibility:** 🟢 / 🟡 / 🔴
[Are failure states machine-parseable and actionable]

**Pricing/Constraint Transparency:** 🟢 / 🟡 / 🔴
[Can an agent understand costs and limits without human interpretation]

**Gaps Identified:**
🔴 [Gap 1 — gap type, specific element, why it breaks AI comprehension]
🟡 [Gap 2 — partial issue, what works vs. what doesn't]

**Recommendations:**
[Specific, prioritized changes that would improve AI readability — e.g., add aria-labels, expose field via API, add error codes]
```

---

### Combining with Persona Reviews

AI audit and persona reviews are complementary. Use both when:
- A flow serves both human users **and** AI agents (e.g., Actor detail page)
- You want to identify gaps that hurt the **AI Agent Builder** persona specifically
- A feature is being evaluated for MCP or API-first usage

Flag observations that appear in both reviews with `[BOTH]` to highlight highest-priority issues.

---

## How to Use This Skill

### Single Persona Review
```
Review this Actor detail page as a Citizen Integrator - Budget Conscious variant
```

### Multi-Persona Comparison
```
Review the pricing page from 3 perspectives:
1. Citizen Integrator (Budget Conscious)
2. Technical Integrator (Startup CTO)
3. AI Agent Builder (Augmented PM)
```

### Journey Walkthrough
```
Walk through the first-run experience as a Technical Integrator - Backend Builder
```

### Feature Evaluation
```
Evaluate the new MCP integration as an AI Agent Builder - AI-First Developer
```

### AI Comprehension Audit
```
Run an AI & Bot Comprehension Audit on the Actor detail page
```

### Combined Review
```
Review the pricing page as an AI Agent Builder (Augmented PM) and run an AI audit — flag any [BOTH] issues
```

## Persona Quick Reference

| Persona | Tech Level | Pays | Primary Goal | Key Friction |
|---------|-----------|------|--------------|______________|
| Citizen Integrator | Beginner | $49-99 | Automate social/marketing data | Technical complexity |
| Technical Integrator | Pro | $99-499 | Reliable API/webhook data | Documentation gaps |
| Creator | Pro | $99-299 | Build products fast | Infrastructure overhead |
| Publisher | Pro | $0 (earns) | Monetize Actors | Discovery & revenue |
| AI Agent Builder | Varies | $49-199 | Data for AI workflows | Integration reliability |
