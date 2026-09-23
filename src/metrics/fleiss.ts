import type { Dataset } from '../dataset/dataset'
import { MINIMUM_ITEMS, type MetricResult } from './metric-result'
import { checkCategory } from './ratings'

// Fleiss' κ from a count table: counts[i][j] raters put item i in category j,
// every item rated by the same number of raters m. κ = (P̄ − P̄_e)/(1 − P̄_e),
// with P̄ the mean share of agreeing rater pairs per item and P̄_e = Σ p_j².
// n counts the items; fewer than MINIMUM_ITEMS are too few to report. Items
// with differing m break the table's contract, so they throw.
export function fleissKappaFromCounts(counts: readonly (readonly number[])[]): MetricResult {
  const n = counts.length
  const m = (counts[0] ?? []).reduce((sum, count) => sum + count, 0)
  if (n === 0 || m < 2) return { kind: 'no-pairable-values' }

  const categoryTotals: number[] = []
  let agreement = 0
  counts.forEach((row, item) => {
    let raters = 0
    let agreeing = 0
    row.forEach((count, category) => {
      raters += count
      agreeing += count * (count - 1)
      categoryTotals[category] = (categoryTotals[category] ?? 0) + count
    })
    if (raters !== m) throw new RangeError(`Item ${item} has ${raters} ratings, not ${m}`)
    agreement += agreeing / (m * (m - 1))
  })

  if (n < MINIMUM_ITEMS) return { kind: 'too-few-items', n, minimum: MINIMUM_ITEMS }
  // Every rating is one category: P̄_e is 1 and κ is 0/0.
  if (categoryTotals.filter((total) => total > 0).length < 2) return { kind: 'no-variation', n }

  const observed = agreement / n
  const chance = categoryTotals.reduce((sum, total) => sum + (total / (n * m)) ** 2, 0)
  return { kind: 'value', value: (observed - chance) / (1 - chance), n }
}

// Fleiss' κ on a dataset: only the items every rater labelled enter, and n
// counts them. A rater with no ratings at all is left out rather than making
// every item incomplete. Always nominal: the level is ignored. A rating
// outside the categories breaks the Dataset contract, so it throws.
export function fleissKappa(dataset: Dataset): MetricResult {
  const k = dataset.categories.length
  const ratingRows = dataset.ratings.filter((row) => row.some((category) => category !== null))

  const counts: number[][] = []
  dataset.items.forEach((_, item) => {
    const row = new Array<number>(k).fill(0)
    for (const ratings of ratingRows) {
      const category = ratings[item] ?? null
      if (category === null) return
      checkCategory(dataset, category)
      row[category] = (row[category] ?? 0) + 1
    }
    counts.push(row)
  })
  return fleissKappaFromCounts(counts)
}
