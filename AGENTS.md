# Project Agent Rules

## Purpose

This repo uses two external skill systems as recurring workflow tools:

- `mattpocock/skills`: small engineering skills for alignment, TDD, diagnosis, architecture improvement, and shared language.
- `garrytan/gstack`: product, planning, engineering review, design review, QA, release, and retrospective workflow skills.
- `obra/superpowers`: agentic software-development workflow skills for brainstorming, spec approval, planning, TDD, review, and development-branch completion.

Use these skills as process guides, not as authority over the project. Project docs and current user instructions take precedence.

## Project Context

This project is an Agricola Korean Gosu assistant.

Current product direction:

```text
Product flow: Draft Memory Coach
Data-building flow: Strategy Knowledge Base
```

Core near-term engineering goal:

```text
Before UI work, close scoring contract, data validation, and fixture matrix.
```

Primary docs:

- `docs/core/00-vision.md`
- `docs/core/01-domain-language.md`
- `docs/core/02-product-requirements.md`
- `docs/core/03-data-model.md`
- `docs/core/04-feature-specs.md`
- `docs/core/05-roadmap.md`
- `docs/working/00-pre-ui-engineering-review.md`
- `docs/agents/00-agent-operating-model.md`

## Skill Routing

This project uses three workflow layers:

```text
Superpowers: spec and execution discipline
gstack: product, strategy, engineering/design review, QA, ship
mattpocock: alignment, domain language, TDD, diagnosis, architecture maintenance
```

When more than one skill system fits, choose one driver workflow and use the others only as supporting checks. Do not stack multiple long interactive workflows unless the user asks for that depth.

If the official Superpowers plugin is installed, use its skills directly. If it is not available in the active skill list, follow the project fallback workflow in `docs/agents/00-agent-operating-model.md`.

### Superpowers Workflow Layer

Use `brainstorming` from Superpowers when:

- the user wants to brainstorm
- the user wants a light spec before implementation
- the request is a rough feature idea and should not jump straight to code
- we need to compare 2-3 approaches before choosing a build path

For this project, Superpowers brainstorming should write light specs under `docs/working/` unless the user requests another location.

Use `writing-plans` from Superpowers after:

- the light spec is approved
- implementation should be broken into small, verifiable tasks
- exact file paths, tests, and acceptance criteria are needed

Use Superpowers TDD/review/finishing workflows as supporting discipline when:

- executing an approved plan
- checking a branch before merge or PR
- deciding whether to keep, merge, or discard a development branch

Do not let Superpowers planning override this repo's current gate:

```text
Before UI work, close scoring contract, data validation, and fixture matrix.
```

### Product and Scope

Use `office-hours` from gstack when:

- the user is exploring a new product direction
- the request may change the product wedge
- we need to challenge assumptions before implementation

Use `plan-ceo-review` from gstack when:

- scope is expanding
- the product value proposition may be wrong
- we need to choose between multiple product directions

### Pre-Implementation Alignment

Use `grill-me` from mattpocock when:

- the user asks whether more questions remain
- the goal is still ambiguous
- implementation should not start until assumptions are exposed

Use `grill-with-docs` from mattpocock when:

- the plan should update shared project language, ADRs, or docs
- domain terms need to be sharpened before coding
- the work affects architecture or long-lived concepts

### Engineering Plan Review

Use `plan-eng-review` from gstack before:

- starting UI work
- changing data model contracts
- adding validation or import pipelines
- introducing new app architecture

The review should focus on:

- architecture boundaries
- data flow
- test/fixture coverage
- failure modes
- performance and maintainability

### Implementation

Use `tdd` from mattpocock when:

- implementing scoring rules
- adding validation behavior
- fixing a regression
- expanding fixture coverage

Prefer red-green-refactor:

```text
failing fixture/test -> implementation -> refactor
```

Use `prototype` from mattpocock when:

- testing an uncertain scoring idea
- trying multiple UI flows
- exploring a throwaway implementation before committing to architecture

### Debugging

Use `diagnose` from mattpocock or `investigate` from gstack when:

- a test/fixture fails unexpectedly
- scoring output is wrong and the cause is unclear
- a bug crosses data, scoring, and UI layers

No fix before reproduction and hypothesis.

### Architecture Maintenance

Use `improve-codebase-architecture` from mattpocock when:

- modules start growing shallow and tangled
- scoring, validation, and UI concerns blur together
- a refactor is being considered

Use `zoom-out` from mattpocock when:

- a specific file needs explanation in system context
- a new contributor or future agent needs orientation

### Design and UX

Use `design-consultation` or `plan-design-review` from gstack before substantial UI design.

Use `design-review` from gstack after UI implementation if visual quality, responsiveness, or interaction polish matters.

For this project, do not start with a marketing landing page. The first usable surface should be the Draft Memory Coach.

### Review, QA, and Shipping

Use `review` from gstack before merging substantial code changes.

Use `qa` from gstack for interactive browser QA after a UI exists.

Use `qa-only` when the user wants a report without code changes.

Use `ship` from gstack only when the user asks to prepare or publish a release/PR.

Use `retro` from gstack after a meaningful development milestone.

## Local Execution Rules

- Prefer `yarn test` for this repo until npm is repaired.
- Current `npm` command may be broken in the local environment.
- Do not scaffold Next.js UI before scoring contract, data validation, and fixture matrix are closed.
- Keep the draft scoring engine independent from React/Next.js.
- Use `apply_patch` for manual file edits.
- Do not vendor external skill repositories into this repo unless the user explicitly asks.

## Commit and Checkpoint Policy

- The main orchestrator owns commits on the integration branch.
- Sub-agents must not commit to the integration branch unless explicitly instructed.
- Sub-agents may edit files within their assigned write scope and propose commit boundaries.
- Stop for human review before schema, migration, scoring contract, fixture matrix, or user-visible behavior changes.
- Each sub-agent checkpoint report must include changed files, proposed commit message, tests run, unresolved risks, and whether the next step depends on human approval.
- At every checkpoint, recommend both a one-line and a multi-line Conventional Commit message for the work completed so far.
- Multi-line commit message body lines must stay at or below 72 characters and should explain what changed or why it matters, not narrate implementation mechanics.
- If a sub-agent needs direct commit authority, it must work on a separate branch or worktree, such as `agent/api-contract`, `agent/db-validation`, or `agent/ui-draft`, and the orchestrator merges or cherry-picks later.
- Preferred checkpoint and commit gate order for this project is: scoring contract -> data validation -> fixture matrix -> implementation -> docs.

## Data and Domain Rules

- Treat external Agricola data as source material, not as blindly trusted truth.
- Keep card text, community strategy posts, and external databases behind source references and copyright-aware summaries.
- Manual strategy profile curation is expected for high-impact cards.
- Use `brokenReasonTags` as explanation/classification first, not as a strong scoring modifier until enough fixtures exist.

## Installed Skill Sources

Installed into the local Codex skill directory:

- `mattpocock/skills`
- `garrytan/gstack`

Restart Codex after installation to make newly installed skills appear in the active skill list.
