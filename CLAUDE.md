# Concord

Browser-only inter-annotator agreement workbench. No backend, no accounts, no API keys:
the file never leaves the tab.

## Working on v1

- `SPEC.md` is the source of truth: scope table, deferred list, stack, data format,
  metric rules, reference fixtures, and the staged build plan. A capability in neither
  the scope table nor the deferred list is undecided: ask before building it. Scope
  changes by editing `SPEC.md`, not in passing.
- Vocabulary lives in `CONTEXT.md`; name code after it. Decisions live in `docs/adr/`.
- Work one build-plan stage at a time.
- **A stage is done** when `npm run typecheck` and `npm test` pass and a review agent has
  reviewed the change. Only then commit and push to `origin` (github.com/PeytonR72/concord).

### Conventions (inherited from Puddle)

- `tsconfig.app.json` is the source of truth for strictness. Data entering the tab
  arrives as `unknown` and is narrowed by a parser at the boundary. No `any`; no `as`
  outside tests (use `@total-typescript/shoehorn` there).
- Feature folders under `src/`, with pure logic, components and `*.test.ts` side by side.
  `src/metrics/` and `src/analysis/` never import React.
- Commit subjects: imperative, sentence case, no `feat:`/`fix:` prefix, ≤ 72 chars. Body
  explains why, wrapped at 80. Every commit leaves typecheck and tests green.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
