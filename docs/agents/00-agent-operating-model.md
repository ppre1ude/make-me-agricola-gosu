# Agent Operating Model

This document fixes how agents should use the three recurring workflow systems in this repo:

- `obra/superpowers`
- `garrytan/gstack`
- `mattpocock/skills`

These systems are process guides. They do not override user instructions, `AGENTS.md`, or the core project docs.

## Current Project Gate

Do not start substantial UI work until this is closed:

```text
scoring contract + data validation + fixture matrix
```

The default near-term spec target is therefore:

```text
Pre-UI Scoring Contract Closure
```

## Skill System Roles

Use Superpowers for workflow discipline:

- brainstorm before coding
- compare approaches
- turn rough ideas into approved light specs
- write implementation plans after spec approval
- keep TDD, code review, and branch completion explicit

Use gstack for product and review judgment:

- office-hours for product brainstorming or wedge questions
- plan-ceo-review when scope or value proposition is in doubt
- plan-eng-review before architecture, validation, data model, or UI work
- plan-design-review/design-review for UI/UX work
- review, qa, ship, and retro near merge/release milestones

Use mattpocock skills for engineering alignment:

- grill-me when ambiguity remains
- grill-with-docs when domain language or long-lived docs need updates
- tdd for scoring, validation, fixture, and regression work
- diagnose/investigate for unclear failures
- improve-codebase-architecture or zoom-out for structural work

## Driver Workflow Rule

Pick one driver workflow per request.

Recommended drivers:

| Request shape | Driver | Supporting checks |
| --- | --- | --- |
| Rough idea, brainstorm, light spec | Superpowers brainstorming | gstack office-hours if product wedge changes |
| Product direction or scope change | gstack office-hours or plan-ceo-review | Superpowers light spec after direction is chosen |
| Data model, validation, scoring contract | gstack plan-eng-review | Superpowers writing-plans, mattpocock tdd |
| Scoring or fixture implementation | mattpocock tdd | Superpowers TDD/review discipline |
| Ambiguous domain terms | mattpocock grill-with-docs | Superpowers spec after terms settle |
| UI after Schema Stabilization Gate closes | gstack plan-eng-review + plan-design-review | Superpowers writing-plans |
| Bug with unclear cause | diagnose or investigate | Superpowers verification-before-completion |
| Pre-merge check | gstack review | Superpowers requesting-code-review |

Avoid chaining multiple interactive reviews unless the user explicitly wants a deep process.

## Superpowers Fallback

If the official Superpowers plugin is unavailable in the active skill list, emulate the following subset.

### Brainstorming Fallback

Before writing code:

1. Read current context: `AGENTS.md`, relevant `docs/core/*`, and the nearest working doc.
2. Ask one clarifying question at a time when a decision is genuinely open.
3. Propose 2-3 viable approaches with tradeoffs.
4. Recommend one approach based on the project gate and current docs.
5. Present the light spec in short sections for review.
6. Save the approved spec under `docs/working/`.

Light specs should include:

- problem statement
- target user workflow
- non-goals
- core feature behavior
- data and scoring contract impact
- validation and fixture requirements
- acceptance criteria
- open questions

For the current project phase, every light spec must state whether it advances:

```text
scoring contract
data validation
fixture matrix
```

### Writing Plans Fallback

After the light spec is approved:

1. Break the work into small tasks.
2. Name exact files to edit.
3. Put tests or fixture assertions before implementation.
4. Include verification commands, preferring `yarn test`.
5. Keep UI scaffolding out of scope until the Schema Stabilization Gate is closed.

### TDD Fallback

For scoring, validation, and fixture work:

```text
failing fixture/test -> minimal implementation -> refactor -> yarn test
```

Do not write scoring behavior that is not pinned by a fixture or a documented acceptance criterion.

### Review Fallback

Before declaring work done:

- verify `yarn test`
- check that changed docs and code use the domain language in `docs/core/01-domain-language.md`
- confirm no React/Next.js dependency was introduced into the draft scoring engine
- summarize remaining risks and test gaps

## Output Locations

Use these locations by default:

- Light specs: `docs/working/YYYY-MM-DD-short-topic-spec.md`
- Engineering review updates: `docs/working/*engineering-review*.md`
- Long-lived terminology: `docs/core/01-domain-language.md`
- Data model contracts: `docs/core/03-data-model.md`
- Feature behavior: `docs/core/04-feature-specs.md`
- Roadmap sequencing: `docs/core/05-roadmap.md`

Do not vendor external skill repositories into this repo. Prefer official plugin installation plus project-specific routing docs.

## Installation Note

Superpowers is available through the official Codex plugin marketplace. When installed, agents should use its native skills directly. This document remains the project-specific policy layer that constrains how Superpowers, gstack, and mattpocock workflows apply to Agricola Korean Gosu.
