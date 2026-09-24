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
| Metric strip | α with band, Fleiss' κ, mean pairwise Cohen's κ, percent agreement, counts of items, raters, categories. |
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
| Styling | Tailwind 4 via `@tailwindcss/vite`. Tokens planned in `docs/design/tokens.md`, implemented in `src/index.css`, whose `@theme` resets Tailwind's default palette so only tokens exist. New visual identity ("lab notebook"), not Puddle's herbarium. |
| Fonts | Newsreader, Instrument Sans and JetBrains Mono, self-hosted through `@fontsource-variable` packages: no font CDN, so the page makes no third-party request. |
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
  dataset/     Dataset, Item, Level: the canonical model every stage after ingest reads
  ingest/      parse-csv, detect-shape, map-dataset, guardrails
  metrics/     coincidence, alpha, cohen, fleiss, percent-agreement, distance
  analysis/    bands, confusion-shares, hotspots, rater-outliers, summary-markdown
  demo/        demo-dataset (loads public/demo/*.csv with its fixed mapping)
  landing/     landing page, drop zone
  ui/          class strings shared across screens (column, eyebrow, buttons)
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
| Empty item id (either shape) or empty rater (long) | Blocking; list the first 5 row numbers |
| Wide: the same item id on two rows | Blocking; list the first 5 with row numbers |
| Ordinal: a data label missing from the category order (or no order) | Blocking; name the labels |
| Mapping reuses a column, points past the header, or repeats a category in the order | Blocking |

Guardrails are returned as data (a `kind` plus counts, labels and row numbers), and
warnings are returned beside blocking errors as well as on success. Raters, labels and
ratings are counted as they occur in the data: a rater with no ratings doesn't count
toward "2 raters", and "50,000 ratings" counts non-missing ratings in either shape. A
blank text cell is absent, not a conflict.

**Mapping rules** (`ingest/map-dataset.ts`):

- Item ids, rater names, labels and text are trimmed. Missing tokens apply to labels only.
- Items and nominal categories are first-seen in reading order: row by row, and within a
  wide row across the rater columns in mapping order. Raters are first-seen (long) or in
  mapping order (wide). A long file listing each item's ratings together, in the wide
  file's rater order, maps to the identical `Dataset`.
- Ordinal categories are the user's order, including ordered categories nobody used.
  Nominal ignores any order given.
- Wide rater names come from headers; a blank header becomes `Column N` (1-based) and a
  repeated name gets the next free suffix: `alice`, `alice (2)`.

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

Results are a `MetricResult` (`metrics/metric-result.ts`), one of:

- `{ kind: 'value', value, n }`.
- `{ kind: 'no-variation', n }`: a chance-corrected metric whose chance term is zero
  (every pairable value is one category). Percent agreement ignores chance, so a constant
  dataset gives it the value 1, not this.
- `{ kind: 'too-few-items', n, minimum }`: something to compute on, but fewer items than
  the metric trusts (`minimum` is 10): Cohen's κ below 10 shared items, Fleiss' κ below
  10 complete items. The UI renders "too few shared items" or "N/A, use α" from it.
- `{ kind: 'no-pairable-values' }`: nothing to compute on (n = 0). The guardrails block
  this for the full dataset, but leave-one-out α can reach it.

n counts pairable values for α, pairable items for overall percent agreement, shared
items for pair percent agreement and Cohen's κ, and complete items for Fleiss' κ. Mean
pairwise κ is a summary over pairs, and its n depends on the kind (see its row below).
Fleiss' "computed on X of Y items" takes X from n and Y from `dataset.items.length`;
the result does not carry Y.

Cohen's and Fleiss' κ check in this order: no pairable values, then too few items, then
no variation. Mean pairwise κ's order is in its row below.

| Metric | Missing data | Notes |
| --- | --- | --- |
| Percent agreement (overall) | Items with ≥2 labels | Mean over items of P_i = share of agreeing rater pairs on item i. No band; UI notes it ignores chance. |
| Percent agreement (pair) | Items both raters labeled | Raw match rate. |
| Cohen's κ (pair) | Items both raters labeled | Reports n per pair. n < 10 → "too few shared items", excluded from means. Weights: none, linear `|i−j|/(k−1)`, quadratic `((i−j)/(k−1))²` on category indices (sklearn semantics). |
| Mean pairwise κ | Pairs with n ≥ 10 | Nominal: unweighted. Ordinal: quadratic-weighted. Raters tab has an unweighted/linear/quadratic toggle. Averages the pairs with a value; n = those pairs. Pairs with no variation are left out too. With no pair left: no variation if any pair had enough items but one category (n = those pairs), else too few items (n = the most items any pair shares), else no pairable values. |
| Fleiss' κ | Only items every rater labeled | Show "computed on X of Y items". Fewer than 10 complete items → "N/A, use α" with tooltip. Always nominal; labelled "(nominal)" when the dataset is ordinal. A rater with no ratings at all is ignored, so they don't make every item incomplete. |
| Krippendorff's α | Native: items with <2 labels dropped, count noted | Nominal δ = 0/1. Ordinal δ² from the coincidence marginals: `(Σ_{g=c..k} n_g − (n_c+n_k)/2)²`. |

**Weighted κ and unused categories.** Weights use indices in the dataset's full category
order (`dataset.categories`, which keeps ordinal categories nobody used), so a pair's
weights don't shift with which categories that pair happened to use. sklearn's
`cohen_kappa_score` without `labels=` uses only the labels present in the two raters'
data, so when an unused category sits *between* used ones, Concord's linear and
quadratic κ differ from sklearn's; unused categories at either end change nothing. The
`(k−1)` scaling cancels in κ's ratio and is not applied.

### Interpretation bands (`analysis/bands.ts`)

- **α** (Krippendorff 2004): ≥ 0.800 reliable; 0.667 to < 0.800 tentative; < 0.667 unreliable.
- **κ** (Landis & Koch 1977): < 0 poor; 0 to 0.20 slight; 0.21 to 0.40 fair; 0.41 to 0.60
  moderate; 0.61 to 0.80 substantial; 0.81 to 1 almost perfect. The written ranges leave
  gaps, so each κ band's upper edge is inclusive: `[0, 0.20]` slight, `(0.20, 0.40]` fair,
  `(0.40, 0.60]` moderate, `(0.60, 0.80]` substantial, `(0.80, 1]` almost perfect.
- A result that is not a value has no band (`null`); the UI shows its kind instead.
- Each band's tooltip cites its source and says bands are conventions.

### Analyses

- **Coincidence matrix**: each item with m ≥ 2 labels contributes every ordered pair of
  its labels with weight 1/(m−1). Symmetric. Total = number of pairable values.
- **Confusion shares**: off-diagonal cell (c,k), c<k, share = (o_ck + o_kc) / Σ off-diagonal.
  The heatmap colours only off-diagonal cells, by share; the diagonal stays neutral.
  Tooltip: "Sarcastic ↔ Negative: 38.5 pairings (21% of all disagreement)".
  Only confusions somebody made are listed, largest first; pairings equal at 1e-9 tie, and
  ties go to the lower category indices. The first is the pre-selected largest confusion.
  With no disagreement the list is empty rather than dividing by zero.
- **Drill-down**: selecting cell {c,k} lists every item where at least one rater said c
  and another said k, ordered by hotspot rank. The selection is `{ a: category, b: category }`,
  category indices with a < b. It lives in `analysis/hotspots.ts` beside the ranking;
  either order of a and b selects the same items, and a = b is a caller bug (`RangeError`).
- **Hotspots**: items with ≥2 labels ranked by 1 − P_i descending, ties broken by more
  labels first, then item id by UTF-16 code unit (not `localeCompare`, so the order is the
  same in every locale). Ordinal: rank by mean |i−j| over the item's unordered pairs of
  ratings instead.
- **Rater outliers**: per rater, mean pairwise κ against the others, and leave-one-out α
  (α with that rater removed). Flag when LOO α − α ≥ 0.05; message "α would be 0.71
  without R3". Fewer than 3 raters: LOO is N/A and nothing is flagged. A rater with no
  ratings doesn't count towards the 3. The difference is compared with a 1e-9 tolerance,
  so a rounding error can't lose an exact 0.05. Only a value against a value is flagged;
  LOO α is `null` when N/A. Mean κ against the others follows mean pairwise κ's n and
  fallbacks over the pairs that rater is in.
- **Summary Markdown**: metrics with bands and n, the top 3 confusions with shares,
  flagged raters, dataset counts, level of measurement, and a one-line "computed in
  Concord" footer. The layout, fixed by the snapshots in `summary-markdown.test.ts`:

  ```md
  ## Concord agreement summary

  - **Krippendorff's α (nominal):** 0.612, unreliable (n = 812 pairable values)
  - **Fleiss' κ (nominal):** 0.598, moderate (computed on 143 of 200 items)
  - **Mean pairwise Cohen's κ (unweighted):** 0.604, moderate (10 rater pairs)
  - **Percent agreement:** 78%, ignores chance (n = 200 items)

  **Dataset:** 200 items, 5 raters, 4 categories, nominal.

  ### Top confusions

  1. Sarcastic ↔ Negative: 38.5 pairings (21% of all disagreement)

  ### Flagged raters

  - R3: α would be 0.710 without R3

  ---

  Computed in Concord (in the browser; the file never left the tab).
  ```

  α and κ show 3 decimals, pairings 1, percent agreement and shares whole percents. A
  result that isn't a value reads "no variation (…n…)", "too few items (7 of 10)" or "no
  pairable values". Mean κ uses the default weighting. Rater and category names have
  Markdown's formatting characters escaped (backslash, backtick, `*`, `_`, `~`, `|`, `[`,
  `]`, `<`, `>`). Empty sections still print: "None: the raters never disagree." for
  confusions, "None." for flagged raters, and "None: leave-one-out α needs at least 3
  raters." when LOO is N/A.

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
and a test asserts the app matches to 1e-6. Python is run by hand, never by `npm test`,
from a gitignored `scripts/.venv` (the script's docstring has the commands). golden.json
holds α, Fleiss' κ, mean pairwise κ (unweighted) and overall percent agreement, each with
its n, plus every pair's κ and each rater's leave-one-out α. golden.py applies Concord's
rules around the libraries: Fleiss on complete items only, pairs under 10 shared items or
without variation left out of the mean, α's n counting pairable values. Percent agreement
has no reference library, so golden.py computes it from its definition.

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

The generator gives each message a true category and an ambiguity drawn once per message,
so a hard sarcastic message trips most raters. Each rater has a sarcasm-blindness factor;
the Neutral-leaning rater also answers Neutral on about a third of other messages. A
missing rating is a missing row. The seed is chosen so nominal first-seen order reads
`Positive, Neutral, Negative, Sarcastic`.

The tests pin the story, with these readings of "about" and "clear": 190 to 210 items;
exactly 5 raters and those four categories in that order; 6% to 10% of rater × item cells
missing; the largest confusion's share at least 1.5× the second-largest; exactly one
flagged rater, the one with the highest Neutral share; α in [0.55, 0.65]; the fixed
mapping equals what detection proposes for the headers; no blocking error or warning.
Tests read the CSV with Vite's `?raw` import, since the app's tsconfig has no Node types;
the app fetches it from `/demo/support-messages.csv`.

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
- **Decisions**:
  - The shell (`src/App.tsx`, beside `main.tsx`) switches on a screen value from the
    pure `src/screen.ts` reducer: landing (idle, loading the demo or a file, or refused),
    mapping (file name and `RawTable`) or workbench (`Dataset`). One load at a time:
    requests are ignored while one is in flight, and a result nobody is waiting on is
    dropped.
  - Until stage 10, "Try the demo" loads the demo and shows a placeholder with its counts
    of items, raters and categories. Until stage 9, a valid CSV shows a placeholder with
    its file name, headers and row count. Both have a "Start over" button.
  - `landing/check-dropped-files.ts` refuses before reading: no file, more than one
    file, a name not ending `.csv` (any case), or a MIME type other than `text/csv`,
    `application/vnd.ms-excel` (Windows with Excel) or empty; a `.csv` reported as
    `text/plain` is refused too. A wrong-type refusal names the file and points at the
    planned Excel and TSV support. A parser refusal is
    prefixed "<file> couldn't be read."
  - A file dropped beside the drop zone is swallowed rather than opened by the browser.
  - The landing figure is a schematic of the confusion view, not computed data.

### Stage 9: Mapping screen

Prefilled from detection; shape toggle, column selects, rater checkboxes (wide), level
toggle, drag-to-order categories (ordinal), blocking errors and warnings inline,
"Analyse" disabled while anything blocks.

- **Done when**: long, wide and ordinal files go from drop to a `Dataset` in the browser;
  each guardrail message renders.
- **Decisions**:
  - Layout: the form beside a preview of the file's first 8 rows (with file line numbers,
    each column tagged with its role or "not used"), stacked below 768px. Blocking errors,
    then warnings, then "Analyse" and "Start over" sit under the form, with a "Ready: …"
    line naming the counts.
  - Edits go through the pure `mapping/edit-mapping.ts`, and every edit re-runs
    `mapDataset`, so the guardrails always describe what "Analyse" would produce. Clashing
    choices (one column in two roles) are kept for the guardrails to name, except that a
    wide item or text column stops being a rater. Switching shape keeps the item and text
    columns: to wide, every other column becomes a rater; to long, the first two free
    columns become rater and label.
  - Wide raters: a wrapping grid of checkboxes with "Select all", "Select none" and a
    count, scrolling past a fixed height. The item and text columns show but are disabled.
    A column freed from the item or text role isn't ticked back as a rater: the screen
    doesn't guess, and "Select all" is one click away.
  - Ordinal order: the first switch to ordinal prefills the order with the labels in
    first-seen order (`mappedLabels` in `ingest/map-dataset.ts`); switching to nominal and
    back keeps the order the user set. When a column change alters the labels, labels
    that left are dropped and new ones join the end, so the screen itself never produces
    `unordered-labels`. Rows drag (plain HTML drag and drop) and have 44px up and down
    buttons; at either end a button is `aria-disabled`, not `disabled`, so keyboard focus
    stays on it after a move.
  - Guardrail copy (`mapping/messages.ts`) is plain and says the fix, pointing at the
    control for the file's shape. Row lists show up to 5 lines or examples, then "and N
    more". `column-out-of-range`, `category-repeated` and `unordered-labels` can't be
    reached from the screen but still have messages.
  - Warnings get a `warn-rule` border token beside `critical-rule`. A disabled button
    shows a progress cursor while loading and a not-allowed cursor while blocked.
  - Stray file drops are swallowed on every screen, not just the landing page.
  - Measured once on a 50,200-rating long file: drop to mapping screen about 0.4 s
    (parsing included), and each edit about 0.2 s.

### Stage 10: Workbench: metric strip, confusion matrix, drill-down

Metric strip with bands and tooltips. Coincidence heatmap with off-diagonal colouring and
cell tooltips. Click-to-select drill-down listing items with text. Largest confusion
pre-selected on load. Demo path skips mapping.

- **Done when**: the definition of done holds end to end on the demo.
- **Decisions**:
  - Layout: a header (title, dataset counts, "Start over"), the metric strip, then the
    confusion matrix (5 of 12 columns, sticky while the list scrolls) beside the
    drill-down (7 of 12), stacked below 1024px. No tab bar until stage 11.
  - Each strip tile shows the name, its level or weighting, the value, the band word and
    one line saying what n counted. α's band takes its status wash, colour and icon; κ's
    bands and percent agreement's "ignores chance" are plain `ink-muted`. The band is a
    focusable button whose tooltip cites the source and says bands are conventions.
  - A result that isn't a value prints "N/A" with a word and a reason: Fleiss' too few
    items reads "use α instead" ("only 7 of 200 items are complete (needs 10)"); mean κ's
    reads "too few shared items" ("no rater pair shares 10 items (most: 7)"); no variation
    reads "no variation" ("every rating is one category"); no pairable values says what's
    missing. The tooltip explains each. Mean κ's no variation is per pair ("every rater
    pair sharing enough items used one category"). Percent agreement's n reads "pairable
    items".
  - Number formatting (3 decimals for α and κ, whole percents, 1 decimal for pairings,
    grouped counts) lives in `src/format/number.ts`, shared by the strip, the tooltips,
    the mapping screen and the summary Markdown.
  - A confusion is named later category first, `b ↔ a` ("Sarcastic ↔ Negative"): the
    lower-triangle cell, read row ↔ column. Both of its cells, the drill-down and the
    summary Markdown use the same order.
  - Off-diagonal cells print the confusion's disagreement share (under 0.5% prints
    "<1%"), in both of its cells; the diagonal prints its pairings; an empty cell prints
    nothing. The colour step is `ceil(8 × share / largest share)`.
  - Selecting a confusion rings both of its cells, with `aria-pressed`. The ring is 2px
    `ink` outside the cell with a 2px paper gap rather than inset, because an inset ink
    line vanishes on `seq-800`, where the largest confusion always sits. Diagonal and empty
    cells are `aria-disabled` and select nothing. With no disagreement, nothing is selected
    and the drill-down says there is nothing to drill into. A new selection is announced
    politely ("Negative ↔ Neutral: 34 items").
  - The matrix's cells are one tab stop (roving tabindex): the arrow keys move between
    cells, and Home and End go to the ends of the row. Each cell's tooltip is also its
    accessible name. Cells are 3.5rem or wider, and the matrix scrolls sideways inside its
    card, with the row labels pinned.
  - Tooltips are hand-rolled, with no dependency: one `ui/TooltipLayer` shows the
    `data-tooltip` text of the hovered or focused element, fixed to the viewport so a
    scrolling card can't clip it. It follows its anchor through scrolls and resizes, and
    Escape hides it.
  - Each drill-down item shows its id, its text ("No text in the file." without one) and
    one chip per rater who rated it. The confusion's two categories are in the accent
    wash. The first 50 show, then "Show all N items".

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
