import type { Dataset } from '../dataset/dataset'

// Guardrails (SPEC.md, "Guardrails"). Each is data, not a message, so the
// mapping screen words it and tests assert its fields. Row-level problems
// name file lines (RawTable.lineNumbers) and list at most EXAMPLE_LIMIT rows.
export const EXAMPLE_LIMIT = 5
export const MANY_LABELS = 20
export const MANY_RATINGS = 50_000

// A row that repeats something an earlier row already set.
export type RepeatedRow = { item: string; line: number; firstLine: number }
export type RepeatedRating = RepeatedRow & { rater: string }

export type Blocking =
  // The mapping itself can't be applied to the table.
  | { kind: 'column-out-of-range'; column: number }
  | { kind: 'column-reused'; column: number }
  | { kind: 'category-repeated'; category: string }
  // Rows that can't become ratings.
  | { kind: 'empty-item-id'; count: number; lines: readonly number[] }
  | { kind: 'empty-rater'; count: number; lines: readonly number[] }
  | { kind: 'duplicate-rating'; count: number; examples: readonly RepeatedRating[] }
  | { kind: 'duplicate-item'; count: number; examples: readonly RepeatedRow[] }
  // Ordinal: labels in the data that the category order leaves out.
  | { kind: 'unordered-labels'; labels: readonly string[] }
  // Nothing to measure agreement on.
  | { kind: 'too-few-raters'; raters: number }
  | { kind: 'too-few-labels'; labels: readonly string[] }
  | { kind: 'no-pairable-item' }

export type Warning =
  // Did the user map the text column as the label?
  | { kind: 'many-labels'; labels: number }
  | { kind: 'many-ratings'; ratings: number }
  // The item's first non-empty text is kept.
  | { kind: 'conflicting-text'; count: number; examples: readonly RepeatedRow[] }

// The guardrails that depend only on the mapped dataset. Raters, labels and
// ratings are counted as they occur in the data, so a rater with no ratings,
// or an ordinal category nobody used, counts toward nothing.
export function checkDataset(dataset: Dataset): {
  blocking: Blocking[]
  warnings: Warning[]
} {
  const blocking: Blocking[] = []
  const warnings: Warning[] = []

  const used = new Set<number>()
  let ratingCount = 0
  let ratingRaters = 0
  const perItem = dataset.items.map(() => 0)
  for (const row of dataset.ratings) {
    let rated = false
    row.forEach((category, item) => {
      if (category === null) return
      used.add(category)
      rated = true
      ratingCount += 1
      perItem[item] = (perItem[item] ?? 0) + 1
    })
    if (rated) ratingRaters += 1
  }
  const usedCategories = dataset.categories.filter((_, index) => used.has(index))

  if (ratingRaters < 2) blocking.push({ kind: 'too-few-raters', raters: ratingRaters })
  if (usedCategories.length < 2) {
    blocking.push({ kind: 'too-few-labels', labels: usedCategories })
  }
  if (!perItem.some((count) => count >= 2)) blocking.push({ kind: 'no-pairable-item' })

  if (usedCategories.length > MANY_LABELS) {
    warnings.push({ kind: 'many-labels', labels: usedCategories.length })
  }
  if (ratingCount > MANY_RATINGS) warnings.push({ kind: 'many-ratings', ratings: ratingCount })

  return { blocking, warnings }
}
