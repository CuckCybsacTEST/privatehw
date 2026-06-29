# Design System Master

This folder captures the project-wide design rules in smaller, more actionable documents.

## Authority

- [DESIGN.md](../DESIGN.md) is the source of truth for visual decisions.
- This folder documents how to apply those decisions consistently.
- If a rule conflicts with [DESIGN.md](../DESIGN.md), follow [DESIGN.md](../DESIGN.md).

## Current stack audit

The current repository is not a Next.js app.

- Vite app
- React Router
- JavaScript / JSX source files
- No Tailwind CSS config found
- No `components.json` found
- No shadcn/ui setup found

## Current visual direction

The interface should feel like a premium, private, after-dark club experience:

- deep black and wine-black surfaces
- premium red used as a signal, not a flood
- ember-orange and amber for controlled heat
- subtle smoke, gloss, and cinematic glow
- luxurious but restrained motion
- mobile-first conversion surfaces

The design must suggest exclusivity and desire without becoming vulgar, busy, or explicit.

## Files in this folder

- `tokens.md`: canonical color, type, spacing, radius, and shadow tokens.
- `components.md`: component-level behavior and styling rules.
- `layouts.md`: page shell, section, and responsive layout rules.
- `accessibility.md`: baseline accessibility requirements.
- `migration-plan.md`: phased visual migration plan and tooling recommendations.

## Usage rule

When building or revising UI:

1. Read `DESIGN.md`.
2. Read the relevant doc in this folder.
3. Match the current code structure before introducing changes.

## Guardrails

- Do not invent new brand colors or visual effects outside the token set.
- Do not change business logic as part of design documentation work.
- Do not introduce new dependencies as part of documentation work.
- Keep the documentation usable for future UI refactors without assuming a framework migration has happened.
