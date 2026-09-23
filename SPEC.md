# Concord v1 spec

Concord is a browser-only inter-annotator agreement workbench. You drop in a CSV of
labels from several raters, and it tells you how much they agree, where they disagree,
and which label pairs your annotation guidelines fail to separate. The file never leaves
the tab: no backend, no accounts, no API keys.

This file is the source of truth for v1. Vocabulary is defined in `CONTEXT.md`; use those
terms in code. Decisions that were argued over live in `docs/adr/`.

## Who it is for

**Primary: a hiring reviewer** reading Concord as portfolio evidence. They arrive on a
desktop browser with no file of their own and click one button.

**Secondary: an annotation lead** with a real CSV. The math must be correct enough that
this person could trust it. Where polish and breadth conflict, polish wins; where polish
and correctness conflict, correctness wins.

Designed against desktop. Phones must pass (nothing overflows, controls take a thumb),
not shine.

### Definition of done

A stranger lands on the site, clicks "Try the demo", and without any further action sees
the headline metrics and the confusion matrix with **Sarcastic ↔ Negative** selected and
the disputed messages listed beside it.

## v1 scope

The boundary column is part of the scope. A capability absent from both this table and
the deferred list is **undecided**: ask before building it.

| Capability | Boundary |
| --- | --- |
| File ingest | One CSV per session, drag-drop or file picker. Header row required. Parsed with Papa Parse on the main thread. |
| Shape detection | Long (`item, rater, label`) or wide (`item` + one column per rater), auto-detected, always confirmed on the mapping screen. |
| Mapping screen | Prefilled from detection. Pick shape, item column, rater column(s), label column (long), optional text column, level of measurement, and category order for ordinal. |
| Levels of measurement | Nominal and ordinal. |
| Metrics | Percent agreement, Cohen's κ per rater pair (unweighted, linear, quadratic), Fleiss' κ, Krippendorff's α (nominal, ordinal). |
| Metric strip | α with band, Fleiss' κ, mean pairwise Cohen's κ, percent agreement, counts of items, raters, labels. |
| Confusion view (hero) | Krippendorff coincidence matrix as a heatmap; click a cell to list the items behind it. Largest off-diagonal cell pre-selected. |
| Raters tab | Rater × rater κ heatmap (list above 30 raters), mean pairwise κ and leave-one-out α per rater, outlier flag. |
| Items tab | Hotspot list ranked by disagreement with an inline label distribution bar. |
| Copy summary | One button, Markdown to clipboard. |
| Demo | Bundled synthetic dataset, one click from the landing page, skips the mapping screen. |

### Deferred to v1.1

Each is a decision, not an oversight.

- LLM guideline clarification (bring-your-own key, plus a no-key "Copy prompt" fallback).
  The confusion drill-down's selection (a label pair plus its items) is the payload it
  will consume; keep that selection a plain, serialisable value.
- Bootstrap confidence intervals for α (would need a Web Worker)
- Interval and ratio levels of measurement
- Gwet's AC1/AC2, Scott's π, Light's κ
- Row-normalised confusion toggle
- Excel and TSV input
- Files without a header row
- Multi-label items
- Share links, saved sessions, CSV export of tables
- Dark mode
- Mobile-first layouts

## Stack

Reuses Puddle's (github.com/PeytonR72/puddle) choices except where noted.

| Concern | Choice |
| --- | --- |
| Framework | React 18 + Vite 8 |
| Language | TypeScript 7, Puddle's `tsconfig.app.json` strictness verbatim: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax` |
| Styling | Tailwind 4 via `@tailwindcss/vite`. Tokens planned in `docs/design/tokens.md`, implemented in `src/index.css`. New visual identity, not Puddle's herbarium. |
| CSV parsing | **Papa Parse** (differs from Puddle, see `docs/adr/0001-papa-parse-not-duckdb.md`) |
| Charts | **None.** Heatmaps, bars and lists are hand-rolled SVG / CSS grid (differs from Puddle's Recharts). |
| Tests | Vitest, node environment, `src/**/*.test.ts`. Pure modules are tested; components are not (same open decision as Puddle). |
| Test fixtures | `@total-typescript/shoehorn` for partial fixtures |
| Deploy | Vercel, SPA rewrite `/(.*) → /index.html` |
| Scripts | `dev`, `build` (`tsc -b && vite build`), `typecheck`, `test`, `test:watch`, `preview` |

### Layout

Feature folders; each holds its pure logic, components and tests together. Proposed:

```
src/
  ingest/      parse-csv, detect-shape, map-dataset, guardrails
  metrics/     coincidence, alpha, cohen, fleiss, percent-agreement, distance
  analysis/    bands, confusion-shares, hotspots, rater-outliers, summary-markdown
  demo/        demo-dataset (loads public/demo/*.csv with its fixed mapping)
  landing/     landing page, drop zone
  mapping/     mapping screen
  workbench/   metric strip, confusion matrix, drill-down, tabs
  raters/      rater heatmap and table
  items/       hotspot list
scripts/       build-demo.mjs, golden.py
```

`metrics/` and `analysis/` never import React. UI reaches the math only through them.

## Data format

### Input

- CSV, UTF-8, header row required. Comma delimiter (Papa Parse auto-detect allowed).
- **Missing**: empty cell, `NA`, `N/A`, `null` (case-insensitive, trimmed).
- Labels are trimmed strings. `"1"` and `"1.0"` are different labels. No numeric
  coercion; ordinal order comes from the user.
- **Parsing** (`ingest/parse-csv.ts`) refuses an empty file, an unclosed quote, and a
  row with more cells than the header, naming the file line. Blank lines are skipped;
  a short row is padded with empty (missing) cells. A header-only file parses to zero
  rows and is left to the guardrails. Each row keeps the file line it starts on, for
  guardrail messages.

**Long** (one rating per row):

```csv
item,rater,label,text
m001,alice,Negative,"Great, another outage."
m001,bob,Sarcastic,"Great, another outage."
```

**Wide** (one item per row):

```csv
item,text,alice,bob,carol
m001,"Great, another outage.",Negative,Sarcastic,
```

### Shape detection (pure, `ingest/detect-shape.ts`)

1. If there are 3 or 4 columns, and headers case-insensitively match item-like
   (`item`, `id`, `unit`, `item_id`), rater-like (`rater`, `annotator`, `coder`,
   `worker`) and label-like (`label`, `category`, `rating`, `annotation`), propose
   **long**, with the 4th column proposed as text if it matches `text`, `content`,
   `message`, `sentence`.
2. Otherwise propose **wide**: first column is the item, a column whose header matches
   the text patterns is text, every other column is a rater.
3. Detection only prefills. The mapping screen always shows and every field is editable.

### Guardrails (`ingest/guardrails.ts`)

| Condition | Severity |
| --- | --- |
| Fewer than 2 raters | Blocking |
| Fewer than 2 distinct labels | Blocking |
| Long: duplicate (item, rater) pair | Blocking; list the first 5 with row numbers |
| No item has 2+ labels | Blocking |
| More than 20 distinct labels | Warning: "did you map the text column as the label?" |
| More than 50,000 long-form ratings | Warning; still try |
| Text column has conflicting values for one item | Warning; first value wins |
| More than 30 raters | Not a warning; the rater heatmap renders as a list |

### Internal model

One canonical shape regardless of input. Names follow `CONTEXT.md`.

```ts
type Level = 'nominal' | 'ordinal'

type Dataset = {
  items: readonly Item[]           // { id: string; text?: string }
  raters: readonly string[]
  categories: readonly string[]    // ordinal: in the user's order; nominal: first-seen order
  level: Level
  // ratings[r][i] = category index, or null when missing
  ratings: readonly (readonly (number | null)[])[]
}
```

The reliability matrix (`ratings`) is the only input every metric takes.

## Metrics

Every metric is a pure function of `Dataset` (or its matrix plus level). Every result
carries the n it was computed on, so the UI never has to recompute it.

| Metric | Missing data | Notes |
| --- | --- | --- |
| Percent agreement (overall) | Items with ≥2 labels | Mean over items of P_i = share of agreeing rater pairs on item i. No band; UI notes it ignores chance. |
| Percent agreement (pair) | Items both raters labeled | Raw match rate. |
| Cohen's κ (pair) | Items both raters labeled | Reports n per pair. n < 10 → "too few shared items", excluded from means. Weights: none, linear `|i−j|/(k−1)`, quadratic `((i−j)/(k−1))²` on category indices (sklearn semantics). |
| Mean pairwise κ | Pairs with n ≥ 10 | Nominal: unweighted. Ordinal: quadratic-weighted. Raters tab has an unweighted/linear/quadratic toggle. |
| Fleiss' κ | Only items every rater labeled | Show "computed on X of Y items". Fewer than 10 complete items → "N/A, use α" with tooltip. Always nominal; labelled "(nominal)" when the dataset is ordinal. |
| Krippendorff's α | Native: items with <2 labels dropped, count noted | Nominal δ = 0/1. Ordinal δ² from the coincidence marginals: `(Σ_{g=c..k} n_g − (n_c+n_k)/2)²`. |

### Interpretation bands (`analysis/bands.ts`)

- **α** (Krippendorff 2004): ≥ 0.800 reliable; 0.667 to < 0.800 tentative; < 0.667 unreliable.
- **κ** (Landis & Koch 1977): < 0 poor; 0 to 0.20 slight; 0.21 to 0.40 fair; 0.41 to 0.60
  moderate; 0.61 to 0.80 substantial; 0.81 to 1 almost perfect.
- Each band's tooltip cites its source and says bands are conventions.

### Analyses

- **Coincidence matrix**: each item with m ≥ 2 labels contributes every ordered pair of
  its labels with weight 1/(m−1). Symmetric. Total = number of pairable values.
- **Confusion shares**: off-diagonal cell (c,k), c<k, share = (o_ck + o_kc) / Σ off-diagonal.
  The heatmap colours only off-diagonal cells, by share; the diagonal stays neutral.
  Tooltip: "Sarcastic ↔ Negative: 38.5 pairings (21% of all disagreement)".
- **Drill-down**: selecting cell {c,k} lists every item where at least one rater said c
  and another said k, ordered by hotspot rank. The selection is `{ a: category, b: category }`.
- **Hotspots**: items with ≥2 labels ranked by 1 − P_i descending, ties broken by more
  labels first, then item id. Ordinal: rank by mean pairwise |i−j| over label pairs instead.
- **Rater outliers**: per rater, mean pairwise κ against the others, and leave-one-out α
  (α with that rater removed). Flag when LOO α − α ≥ 0.05; message "α would be 0.71
  without R3". Fewer than 3 raters: LOO is N/A and nothing is flagged.
- **Summary Markdown**: metrics with bands and n, the top 3 confusions with shares,
  flagged raters, dataset counts, level of measurement, and a one-line "computed in
  Concord" footer.

## Correctness

Fixtures live beside the tests as JSON with a `source` field (citation or URL). All
values below were verified by independent computation when this spec was written.

**Krippendorff (2011), "Computing Krippendorff's Alpha-Reliability", example C** (4
coders, 12 units, missing values, categories 1 to 5). Rows are coders, `.` is missing:

```
c1: 1 2 3 3 2 1 4 1 2 . . .
c2: 1 2 3 3 2 2 4 1 2 5 . 3
c3: . 3 3 3 2 3 4 2 2 5 1 .
c4: 1 2 3 3 2 4 4 1 2 5 1 .
```

Pairable values n = 40. α nominal = **0.7434**, ordinal = **0.8154** (interval 0.8491,
not used in v1). This fixture covers missing data, single-label units dropping out, and
ordinal distance in one place.

**Fleiss' κ, Wikipedia worked example** (10 subjects, 14 raters, 5 categories), rows are
subjects, columns are counts per category:

```
0 0 0 0 14 | 0 2 6 4 2 | 0 0 3 5 6 | 0 3 9 2 0 | 2 2 8 1 1
7 7 0 0 0  | 3 2 6 3 0 | 2 5 3 2 2 | 6 5 2 1 0 | 0 2 2 3 7
```

κ = **0.2099** (Wikipedia rounds to 0.210). Fleiss takes counts, so also test a
count-table entry point, or expand the table to a matrix in the fixture.

**Cohen's κ, Wikipedia worked example** (50 items, yes/no): both yes 20, A yes B no 5,
A no B yes 10, both no 15. p_o = 0.70, p_e = 0.50, κ = **0.4**.

**Weighted Cohen's κ, sklearn cross-check** (`sklearn.metrics.cohen_kappa_score`,
categories 1 to 5):

```
a: 1 2 3 4 5 1 2 3 4 5 2 3 3 4 1
b: 1 2 4 4 5 2 2 3 5 5 1 3 2 4 2
```

unweighted **0.502762**, linear **0.736842**, quadratic **0.888889**.

**Properties** (every metric where defined): perfect agreement → 1; swapping raters or
permuting items leaves the value unchanged; relabelling categories consistently leaves
nominal values unchanged; a constant single-category dataset returns a defined "no
variation" result rather than NaN.

**Demo cross-check**: `scripts/golden.py` (sklearn, statsmodels, krippendorff) computes
every headline metric for the demo CSV; its output `src/demo/golden.json` is committed
and a test asserts the app matches to 1e-6. Python is run by hand, never by `npm test`.

## Demo dataset

`scripts/build-demo.mjs`, seeded and deterministic, writes `public/demo/support-messages.csv`
(long shape, with text). Both are committed.

- About 200 short customer-support messages, 5 raters, labels
  `Positive, Neutral, Negative, Sarcastic`, nominal. About 8% of ratings missing.
- Sarcastic ↔ Negative is the largest confusion by a clear margin.
- One rater leans on Neutral when unsure, so they are the flagged outlier (removing them
  raises α by at least 0.05).
- Overall α lands near 0.6: unreliable, but close enough that fixing one guideline would
  plausibly matter.
- The landing page says the data is synthetic.

## Build plan

Each stage is handed to an implementing agent on its own. A stage is done when
`npm run typecheck` and `npm test` pass and a review agent has reviewed it; only then is
it committed and pushed. Stages 1 to 7 have no UI beyond the scaffold, so the math is
locked in before anything renders it.

### Stage 1: Scaffold

Vite + React 18 + TS with Puddle's tsconfig files, Tailwind 4, Vitest (node), Papa Parse
installed, `vercel.json` SPA rewrite, `.gitignore`, placeholder page.

- **Done when**: `npm run build`, `typecheck`, `test` all succeed (one trivial test),
  dev server shows the placeholder.

### Stage 2: Parse and detect

`ingest/parse-csv.ts` turns a `File` or string into a `RawTable` (`headers`, `rows` of
strings), narrowed from Papa Parse's `unknown`. `ingest/detect-shape.ts` proposes a
mapping per the rules above.

- **Done when**: tests cover long, wide, text-column detection, quoted commas, BOM,
  blank trailing lines, an empty file, a header-only file.

### Stage 3: Map to Dataset

`ingest/map-dataset.ts`: `(RawTable, Mapping) → Result<Dataset, Blocking[]>` with
warnings. Missing tokens, category order, text column, all guardrails.

- **Done when**: each guardrail row has a test; long and wide inputs of the same data
  produce identical `Dataset`s.

### Stage 4: Math I (coincidence, α, percent agreement)

`metrics/coincidence.ts`, `metrics/distance.ts`, `metrics/alpha.ts`,
`metrics/percent-agreement.ts`.

- **Done when**: the Krippendorff 2011 fixture passes for nominal and ordinal at 1e-4,
  and the property tests pass.

### Stage 5: Math II (Cohen, Fleiss)

`metrics/cohen.ts` (pairwise, three weightings, n per pair, n < 10 rule),
`metrics/fleiss.ts` (complete-case rule, N/A rule).

- **Done when**: the Wikipedia Cohen, sklearn weighted and Wikipedia Fleiss fixtures pass,
  plus the property tests.

### Stage 6: Analyses

`analysis/bands.ts`, `confusion-shares.ts`, `hotspots.ts`, `rater-outliers.ts`,
`summary-markdown.ts`.

- **Done when**: band boundaries are tested at each edge; hotspot ranking and tie-breaks
  (nominal and ordinal) tested; LOO flag tested including the < 3 raters case; summary
  Markdown snapshot-tested on a small fixture.

### Stage 7: Demo data and golden values

`scripts/build-demo.mjs`, `public/demo/support-messages.csv`, `scripts/golden.py`,
`src/demo/golden.json`, `src/demo/demo-dataset.ts` (fixed mapping).

- **Done when**: the demo meets every story property above (asserted in tests: largest
  confusion pair, flagged rater, α within 0.55 to 0.65), and the app's metrics match
  `golden.json` to 1e-6.

### Stage 8: Design tokens, shell, landing

Run the design direction first (`docs/design/tokens.md`, then `src/index.css`). App shell,
landing page with "Try the demo" and a drop zone / file button, "synthetic data" note.

- **Done when**: tokens doc exists and components use tokens only; landing passes at
  1280px and 375px widths; dropping a non-CSV shows a readable refusal.

### Stage 9: Mapping screen

Prefilled from detection; shape toggle, column selects, rater checkboxes (wide), level
toggle, drag-to-order categories (ordinal), blocking errors and warnings inline,
"Analyse" disabled while anything blocks.

- **Done when**: long, wide and ordinal files go from drop to a `Dataset` in the browser;
  each guardrail message renders.

### Stage 10: Workbench: metric strip, confusion matrix, drill-down

Metric strip with bands and tooltips. Coincidence heatmap with off-diagonal colouring and
cell tooltips. Click-to-select drill-down listing items with text. Largest confusion
pre-selected on load. Demo path skips mapping.

- **Done when**: the definition of done holds end to end on the demo.

### Stage 11: Raters and Items tabs

Rater κ heatmap (list above 30 raters), weighting toggle, rater table with mean κ, LOO α
and flag. Hotspot list with inline distribution bars.

- **Done when**: the demo's outlier rater is visibly flagged with its "α would be …"
  message; the hotspot list's top rows are Sarcastic/Negative splits.

### Stage 12: Summary, states, finish

Copy summary button. Empty, error and loading states across all screens. Phone-width
pass. README (what it is, the demo, the metrics and their sources, the privacy claim,
the deferred list). Vercel deploy.

- **Done when**: the deployed URL meets the definition of done in a fresh browser
  profile, and the README's deferred list matches this spec.
