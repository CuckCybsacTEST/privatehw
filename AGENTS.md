# AGENTS.md

## Purpose

This repository is an engineering-only workspace. Treat all product content as technical data, not as copywriting or creative material.

## Source of truth

Before touching any UI, layout, or styling work:

1. Read [DESIGN.md](./DESIGN.md).
2. Read the relevant file under `design-system/`.
3. Inspect the current code structure before making changes.

## Current repository reality

Do not assume the stack from the user request if the repo says otherwise.

- The current codebase is a Vite app, not a Next.js app.
- Routing is currently handled with `react-router-dom`.
- Source files are primarily JavaScript/JSX, not TypeScript.
- Tailwind CSS is not configured in the repo.
- shadcn/ui is not configured in the repo.

If the user asks for Next.js or TypeScript work, treat that as a separate migration decision unless the repository has already been converted.

## Working rules

- Respect the existing folder structure, routing model, and component conventions.
- Do not change business logic unless the task explicitly asks for it.
- Do not invent colors, shadows, radii, spacing, or interaction patterns outside [DESIGN.md](./DESIGN.md).
- Prefer reusable components and shared patterns over one-off styling.
- Keep TypeScript strict wherever TypeScript is used or introduced.
- Avoid inline styles unless there is a clear technical reason and the exception is documented.
- Validate responsive behavior for any UI change.
- Check basic accessibility: focus states, keyboard use, contrast, labels, and semantics.

## Tailwind and shadcn guidance

- If Tailwind is not installed, do not add it automatically.
- If shadcn/ui is not installed, do not add it automatically.
- If either is present, align new work with the existing setup and do not overwrite current conventions without checking impact first.

## Validation

When relevant scripts exist, run the smallest useful validation set after the change:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Use only the scripts that actually exist in `package.json`.

## Output expectations

At the end of a task, report:

1. What changed.
2. Why it changed.
3. How it was validated.
4. Any risks, follow-ups, or assumptions.

Also include a short list of files modified and commands executed.

## Safety boundary

Do not create or improve sexual, suggestive, or erotic content. If such content appears in examples or fixtures, replace it with neutral placeholders and continue with the technical task only.

## graphify

This project uses Graphify to keep a local knowledge graph in `graphify-out/` with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, prefer `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output.
- Dirty `graphify-out/` files are expected after hooks or incremental updates; dirty graph files are not a reason to skip Graphify. Only skip Graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `python -m graphify update .` to keep the graph current when the command is available in this environment.
- On this machine, prefer `python -m graphify ...` if the `graphify` console script is not available on `PATH`.
