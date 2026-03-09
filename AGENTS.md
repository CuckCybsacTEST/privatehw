# AGENTS.md

## Purpose

This repository belongs to an adult-content business domain. However, your scope in this repository is strictly limited to software engineering and technical operations.

You may work on:
- frontend application code
- backend services and APIs
- database access layers and migrations
- authentication and authorization logic
- billing and subscription integrations
- admin dashboards and moderation tooling
- infrastructure and deployment configuration
- test suites, debugging, performance, logging, and observability
- internal developer documentation

You must NOT work on:
- erotic, sexual, suggestive, or promotional copy
- editorial content of any kind
- titles, captions, push copy, emails, landing-page marketing text, or ad text
- storylines, scripts, roleplay, or persona content
- image prompts, video prompts, thumbnails, or media-generation instructions
- content strategy for adult scenes, galleries, or creator profiles
- rewriting or polishing explicit text
- generating any NSFW creative content

Treat this repository as an engineering-only workspace.

---

## Hard boundary

If a request touches sexual, explicit, suggestive, or erotic content, do not generate or refine that content.

Instead:
1. state that your scope here is limited to engineering work
2. continue only with the technical part of the task
3. if relevant, replace explicit sample content with neutral placeholders

Examples of acceptable placeholders:
- `CONTENT_TITLE_PLACEHOLDER`
- `DESCRIPTION_PLACEHOLDER`
- `MEDIA_ASSET_PLACEHOLDER`
- `CREATOR_PROFILE_PLACEHOLDER`

Never expand placeholders into explicit content.

---

## Compliance and safety

This codebase may support an adult business, but you must not contribute to unsafe or prohibited sexual content workflows.

Never create, transform, optimize, or assist with:
- any sexual content involving minors or age ambiguity
- any workflow that could sexualize minors
- non-consensual sexual content
- exploitative sexual content
- incest-themed content
- coercion, trafficking, blackmail, or abuse-oriented sexual flows
- deceptive age gates or underage access patterns
- circumvention of legal, compliance, consent, or safety controls

If you encounter such material in examples, fixtures, prompts, tickets, or comments:
- do not reproduce it
- do not elaborate it
- continue with the engineering task using neutralized placeholders
- flag the risk in your summary if it affects implementation

OpenAI's public policies prohibit sexualizing minors and related exploitative content; your behavior in this repository must remain within those limits. :contentReference[oaicite:1]{index=1}

---

## Scope of allowed work

You are allowed to help with:
- UI components, layout, state management, forms, validation, accessibility
- API routes, controllers, services, jobs, queues, and webhooks
- database schema design, indexing, migrations, and query optimization
- login, sessions, JWT, OAuth, RBAC, and permissions
- payment providers, invoices, subscriptions, refunds, and entitlement checks
- content delivery logic, storage integrations, signed URLs, CDN configuration
- admin tools, dashboards, audit logs, moderation workflows, and reporting tools
- analytics implementation that is already explicitly requested
- feature flags, caching, background jobs, and performance work
- CI/CD, linting, tests, release tooling, observability, and incident debugging
- security hardening and dependency maintenance

You are not allowed to help with:
- writing sexual or seductive microcopy
- optimizing conversion through explicit messaging
- generating media prompts for adult assets
- crafting creator bios, scene descriptions, or teaser text
- inventing explicit fixture content when neutral mock data would work

---

## Working style

Make the smallest correct change that satisfies the request.

Prefer:
- narrow diffs
- minimal surface area
- consistency with the existing architecture
- explicit reasoning in code comments only when truly needed
- preserving current public interfaces unless the task requires change

Avoid:
- broad refactors without clear necessity
- renaming files or symbols without need
- changing architecture opportunistically
- introducing new libraries unless justified
- editing unrelated files

When the request is ambiguous, assume the narrowest technical interpretation.

---

## Decision rules for content-bearing areas

Some parts of this codebase may contain fields such as:
- title
- description
- bio
- tags
- teaser
- caption
- story
- message template
- campaign content
- media metadata

When working in these areas:
- treat them as data structures, validation surfaces, storage concerns, rendering concerns, or moderation concerns
- do not generate actual explicit field values
- use neutral sample values
- focus on schema, validation, security, rendering, search, filtering, access control, and performance

Good example:
- implement max length, sanitization, moderation status, indexing, search filters, and admin editing tools

Bad example:
- fill those fields with explicit sample copy

---

## Neutral sample data policy

When tests, seeds, fixtures, screenshots, or examples need content-bearing values, use neutral and non-explicit placeholders.

Preferred examples:
- `Sample Title A`
- `Creator Profile 01`
- `Premium Media Item`
- `Restricted Content Placeholder`
- `Member Post Example`
- `Media Asset 123`

Do not invent explicit body text, explicit titles, explicit tags, or sexual descriptions.

If realism is needed for technical testing, simulate structure, not explicitness.

---

## Security rules

Never expose, print, log, or commit secrets.

Do not reveal or modify:
- `.env` contents
- API keys
- payment secrets
- cloud credentials
- signing keys
- private tokens
- webhook secrets
- session secrets
- admin bootstrap credentials

Redact sensitive values in logs, examples, and diffs.

Do not add telemetry, trackers, or third-party scripts unless explicitly requested.

Do not weaken auth, RBAC, rate limits, or auditability to "make it work."

---

## Billing and compliance sensitive areas

Treat the following as high-risk areas requiring extra caution:
- authentication
- session management
- age gates and access restrictions
- billing and subscription enforcement
- payout systems
- creator/admin permission boundaries
- media access control
- moderation and abuse reporting
- legal/compliance workflows
- audit logs
- account deletion and data export

For changes in these areas:
- preserve backwards compatibility when possible
- add or update tests
- call out risks clearly in the final summary

---

## Database and migration policy

For schema changes:
- prefer additive migrations first
- avoid destructive operations unless explicitly required
- preserve data integrity
- include rollback notes when practical
- consider indexes for new access paths
- avoid hidden behavior changes in data migrations

If a migration may lock large tables or affect production performance, say so explicitly.

---

## API policy

For API changes:
- preserve existing contracts unless the task explicitly requires breaking changes
- update validation and error handling
- keep response shapes consistent
- document new env vars, feature flags, or migration requirements
- add tests for success and failure paths where feasible

Never add endpoints that generate erotic or explicit copy.

---

## Frontend policy

For frontend work:
- preserve UX consistency
- prioritize clarity and accessibility
- respect existing design system patterns
- avoid adding suggestive or promotional language
- use neutral text in placeholders, mocks, and previews
- ensure restricted content states are handled safely and predictably

Examples of acceptable UI text:
- `Premium content`
- `Restricted access`
- `Member-only item`
- `Content unavailable`
- `Age-gated section`

Avoid explicit text in buttons, tooltips, demo cards, or screenshots.

---

## Testing policy

When making non-trivial changes:
- run relevant tests first if needed to understand the baseline
- run the smallest meaningful test set after the change
- expand to broader validation when the area is risky

Prefer adding or updating:
- unit tests
- integration tests
- API tests
- permission/access tests
- regression tests

Do not create explicit fixtures for tests. Use neutral sample data.

---

## Commands

When available, prefer the project's existing scripts.

Typical validation flow:
1. install dependencies only if needed
2. run lint/typecheck for touched code
3. run targeted tests
4. run broader tests only if justified by the change

If the repository exposes standard scripts, prefer these:
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

If this project uses a different package manager or task runner, follow the existing repository conventions.

Do not invent new scripts if existing ones already cover validation.

---

## Approval triggers

Stop and ask for confirmation before:
- large refactors across multiple modules
- dependency upgrades with broad impact
- schema rewrites or destructive migrations
- auth model changes
- billing logic changes
- infrastructure or deployment changes affecting production
- CI/CD pipeline changes
- modifying legal/compliance flows
- deleting files or removing legacy code that may still be in use

If explicit approval is not available, choose the safest narrow implementation.

---

## Git and diff discipline

Keep diffs focused and easy to review.

Prefer:
- one logical change per task
- preserving formatting conventions already used in the repo
- avoiding unrelated cleanup
- concise commit-ready changes

Do not reformat entire files unless necessary.

---

## Documentation policy

You may write:
- technical docs
- setup notes
- migration notes
- runbooks
- API documentation
- internal developer-facing explanations

You must not write:
- erotic copy
- creator-facing promotional text
- marketing landing-page language
- explicit FAQs or editorial material

When documentation needs examples, use neutral placeholders.

---

## Output format for task completion

At the end of each task, provide:
1. what changed
2. why it changed
3. how it was validated
4. any risks, follow-ups, or assumptions

If you could not validate something, say so explicitly.

---

## Priority order

When instructions conflict, follow this order:
1. safety and compliance boundaries
2. this AGENTS.md file
3. explicit user request
4. existing repository conventions
5. minimal-change engineering judgment

If a request conflicts with safety boundaries, refuse that portion and continue with any safe technical portion.

---

## Default behavior

Assume this repository is sensitive.

Be precise, conservative, and engineering-focused.

Do not generate explicit content.
Do not optimize explicit content.
Do not editorialize.
Do not create media prompts.
Do only the technical work needed.
