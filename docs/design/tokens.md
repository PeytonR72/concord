# Design tokens

Concord's visual identity: **lab notebook**. Warm paper, near-black ink, one indigo
accent. It should read like a careful methods section, because Concord's pitch is
statistics you can trust. It is not Puddle's herbarium.

This file plans the tokens. `src/index.css` implements them as a Tailwind 4 `@theme`
block, and this file wins where the two disagree. **Components use tokens only.** The
`@theme` block resets Tailwind's default colours, fonts, type sizes, letter spacing, radii and
shadows, so a class such as `text-gray-500` or `rounded-xl` doesn't exist and can't
slip in. Spacing (the 4px scale, `--spacing: 0.25rem`), container widths (`max-w-5xl`,
`max-w-prose`) and breakpoints are Tailwind's defaults on purpose: they are already a
scale, so they count as tokens. Arbitrary values (`tracking-[…]`, `bg-[#…]`) are not
used; a value that needs one becomes a token here first. Class strings that several
components share (the page column, the eyebrow, buttons) live in `src/ui/classes.ts`.

Scope (SPEC.md): light mode only; designed against desktop. Phones must pass: nothing
overflows, and controls are at least 44px tall.

Contrast figures are WCAG ratios against `paper` unless noted. They were checked with
the dataviz skill's `validate_palette.js` (`contrast`, and the categorical and ordinal
checks).

## Colour

### Surfaces and rules

| Token | Hex | Use |
| --- | --- | --- |
| `paper` | `#faf8f3` | Page background. |
| `paper-raised` | `#fffdf9` | Cards and the drop zone, one step lifted off the page. |
| `paper-sunk` | `#f3f0ea` | Wells, code, the drop zone while a file is dragged over it. |
| `paper-deep` | `#e9e6df` | Pressed states; the heatmap diagonal. |
| `rule` | `#dbd7cf` | Hairlines, card borders, table rules. |
| `rule-strong` | `#b9b4aa` | The drop zone's dashed border, input borders. |

### Ink

| Token | Hex | Contrast | Use |
| --- | --- | --- | --- |
| `ink` | `#1c1b19` | 16.5 | Body text and headings. |
| `ink-muted` | `#58554f` | 7.0 | Secondary text: captions, table headers. |
| `ink-faint` | `#6b6862` | 5.2 | Tertiary text: notes and footers. Still AA for body text. |

### Accent

| Token | Hex | Contrast | Use |
| --- | --- | --- | --- |
| `accent` | `#3d4097` | 8.3 | The primary button, links, focus ring, the selected state. |
| `accent-strong` | `#2f3180` | 10.6 | Primary button hover and press. |
| `accent-wash` | `#ecefff` | n/a | Selected rows; the drop zone while dragging. |
| `on-accent` | `#faf8f3` | 8.3 on `accent` | Text on `accent`. |

### Status (bands and refusals)

Status is reserved for verdicts: α bands, blocking errors and warnings. It never marks a
series. Status is always paired with a word, and with an icon where space allows, so it
never relies on colour alone. The text colours clear 4.5:1 on both `paper` and their wash.

| Token | Hex | Use |
| --- | --- | --- |
| `good` / `good-wash` | `#246e3a` / `#e9f0e9` | α reliable. |
| `warn` / `warn-wash` | `#915c08` / `#f6ecdb` | α tentative; guardrail warnings. |
| `critical` / `critical-wash` | `#ac312a` / `#f7e5e2` | α unreliable; refusals and blocking errors. |
| `warn-rule` | `#dec9a8` | The border of a warning box. |
| `critical-rule` | `#e5bab4` | The border of a refusal or blocking-error box. |

The κ bands (slight to almost perfect) are six words on a convention, not verdicts, so
they render in `ink-muted` without a status colour.

## Data visualisation

These are planned now so stage 10 needn't reopen the tokens.

### Sequential: `seq-100` to `seq-800` (indigo, OKLCH hue 277)

The heatmaps encode magnitude with one hue, light to dark. Lightness is monotone with
steps at least 0.06 apart, and steps 400 to 800 pass the ordinal ramp check.

| Step | Hex | Cell text |
| --- | --- | --- |
| 100 | `#ecefff` | `ink` |
| 200 | `#d4dafb` | `ink` |
| 300 | `#b6bff3` | `ink` |
| 400 | `#949ee6` | `ink` (6.8) |
| 500 | `#717bd4` | `ink` (4.5) |
| 600 | `#5359ba` | `on-accent` (5.6) |
| 700 | `#3b3d98` | `on-accent` (8.6) |
| 800 | `#2a2b72` | `on-accent` (11.7) |

- **Confusion matrix** (coincidence heatmap). Only off-diagonal cells are coloured, by
  disagreement share. A share above zero maps linearly onto steps 100 to 800, scaled to
  the largest share in the matrix, so the top confusion is always `seq-800`. A cell with
  no pairings is `paper-raised`, which reads as empty rather than as a small share.
- **Diagonal**: `viz-diagonal` (`paper-deep`), unscaled, with `ink` text. Agreement is
  not what the view ranks, so it stays neutral.
- **Selected cell**: a 2px `ink` outline inset in the cell, plus `aria-pressed`.
  It is not a colour change, so the share still reads.
- **Rater κ heatmap**: κ in [0, 1] maps onto steps 100 to 800. A negative κ is
  `viz-negative` (`critical-wash`) with its value always printed in the cell. That is
  rare, and a diverging scale would spend a whole arm on it.
- Cells print their value where they are at least 40px, so colour is never the only
  channel. Every cell also has a tooltip and is reachable from the keyboard.

### Categorical: `cat-1` to `cat-8`

For the Items tab's label-distribution bars, one colour per category, assigned in
category order and never cycled. These are the dataviz reference hues in their validated
order, re-run against `paper`. The worst adjacent CVD ΔE is 9.1 and the worst adjacent
normal-vision ΔE is 19.6, both passing.

| Slot | Hex | Slot | Hex |
| --- | --- | --- | --- |
| 1 | `#2a78d6` | 5 | `#e87ba4` |
| 2 | `#eb6834` | 6 | `#008300` |
| 3 | `#1baf7a` | 7 | `#4a3aa7` |
| 4 | `#eda100` | 8 | `#e34948` |

- Slots 3, 4 and 5 fall below 3:1 against `paper`, so the relief rule applies. The bars
  always sit under a legend that names every category, and each segment's tooltip gives
  its category and count.
- Adjacent segments are separated by a 2px `paper` gap.
- A dataset with more than 8 categories folds categories 8 and above into one `cat-other`
  segment (`#a8a39a`), named "Other" in the legend.

## Type

The fonts are self-hosted through `@fontsource-variable` packages and bundled by Vite,
so the page makes no request to a font CDN and nothing leaves the tab.

| Token | Family | Use |
| --- | --- | --- |
| `font-display` | Newsreader Variable, Georgia, serif | Wordmark, page and section titles. |
| `font-sans` | Instrument Sans Variable, system-ui, sans-serif | Everything else: UI and body text. |
| `font-mono` | JetBrains Mono Variable, ui-monospace, monospace | Metric values, counts and file names, always with `tabular-nums`. |

| Token | Size / line height | Use |
| --- | --- | --- |
| `text-display` | clamp(2.25rem → 3.5rem) / 1.05 | The landing headline, from 375px up to 1280px. |
| `text-title` | 1.75rem / 1.2 | Screen titles. |
| `text-heading` | 1.25rem / 1.3 | Section and card headings. |
| `text-body` | 1rem / 1.6 | Body text. |
| `text-small` | 0.875rem / 1.5 | Secondary text, buttons, table cells. |
| `text-caption` | 0.75rem / 1.4 | Eyebrows and labels. An eyebrow is uppercase with `tracking-eyebrow`. |
| `text-metric` | 2.25rem / 1 | Metric-strip values (stage 10). |

| Token | Value | Use |
| --- | --- | --- |
| `tracking-tight` | -0.015em | Display and wordmark type. |
| `tracking-eyebrow` | 0.08em | Uppercase caption eyebrows. |

Measure: prose is capped at `max-w-prose` (65ch).

## Shape, depth, focus, motion

| Token | Value | Use |
| --- | --- | --- |
| `radius-sm` | 4px | Heatmap cells, chips, bar ends. |
| `radius-md` | 8px | Buttons and inputs. |
| `radius-lg` | 12px | Cards and the drop zone. |
| `shadow-card` | `0 1px 0 rgb(28 27 25 / 0.04), 0 1px 3px rgb(28 27 25 / 0.06)` | Raised cards. Kept faint, because paper doesn't float. |
| Focus ring | 2px `accent` outline, 2px offset | Every interactive element, via `:focus-visible`. |
| `ease-out` | `cubic-bezier(0.2, 0, 0, 1)`, 150ms | Hover and drag-over transitions. Removed under `prefers-reduced-motion`. |

## Layout

- The content column is `max-w-5xl` (64rem) and centred, with a 24px gutter (16px below
  640px).
- The shell is a thin top bar (wordmark, privacy line) over the screen.
- Touch targets are at least 44px tall (`min-h-11`).
- Breakpoints are Tailwind's defaults. The layout is written for desktop, and `sm:`/`md:`
  only widen it. Below 640px everything stacks in one column.
