# Migration Plan

## Summary

This is a documentation-first visual migration plan. It does not change business logic or force a framework migration.

## Tooling status

- Tailwind CSS: not installed in the current repo.
- shadcn/ui: not installed in the current repo.
- Next.js: not the current stack.
- TypeScript: not the current source language.

## Recommendation

- Do not install Tailwind automatically.
- Do not install shadcn/ui automatically.
- If the team later wants a framework migration, decide that separately from the design system rollout.
- For the current codebase, prefer incremental CSS and component updates that match the existing Vite + React Router structure.

## Phase 1

Focus:

- tokens
- global variables
- buttons
- inputs
- cards

Goal:

- Establish the visual baseline first.
- Standardize the most repeated UI primitives.
- Remove visual drift from core interactive elements.

## Phase 2

Focus:

- main layout
- sidebar / navbar
- forms
- tables
- modals

Goal:

- Improve the structural shell of the product.
- Make operational screens easier to scan and act on.
- Normalize the highest-friction patterns.

## Phase 3

Focus:

- empty states
- loading states
- finer responsive tuning
- accessibility polish
- visual cleanup

Goal:

- Close the quality gaps.
- Make the UI feel deliberate on every screen size.
- Remove generic or inconsistent surfaces.

## Safe implementation order

1. Document the design rules.
2. Map tokens to CSS variables or theme variables.
3. Refactor core primitives only after the token layer is stable.
4. Update shared layout patterns.
5. Clean up page-specific surfaces.

## Risks detected

- The repository does not match the user's assumed Next.js + TypeScript stack.
- The current CSS is large and monolithic, so token changes should be introduced carefully.
- There is no Tailwind or shadcn foundation to build on, so a future migration should be intentional instead of automatic.

## Follow-up options

1. Keep the current stack and progressively align existing CSS/components to these docs.
2. Plan a separate Next.js + TypeScript migration after the design system is accepted.
3. Add a thin design-token layer in CSS variables before touching page layouts.
