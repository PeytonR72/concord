import type { Dataset, Level } from '../dataset/dataset'
import { MINIMUM_ITEMS, type MetricResult } from './metric-result'
import { sharedRatings } from './ratings'

export type Weighting = 'unweighted' | 'linear' | 'quadratic'

// Cohen's κ between raters a and b over the items both rated: 1 − Σ w·o / Σ w·e,
// with o the observed contingency table and e its chance expectation from the
// two raters' marginals. n counts the shared items; fewer than MINIMUM_ITEMS
// are too few to report. Weights sit on category indices in the dataset's full
// order, so an ordinal category nobody used still counts towards a distance.
// A rater index or rating outside the dataset is a caller bug, so it throws.
export function cohenKappa(
  dataset: Dataset,
  a: number,
  b: number,
  weighting: Weighting,
): MetricResult {
  const shared = sharedRatings(dataset, a, b)
  const n = shared.length
  const k = dataset.categories.length
  const table = Array.from({ length: k }, () => new Array<number>(k).fill(0))
  for (const [x, y] of shared) {
    const row = table[x]
    if (row !== undefined) row[y] = (row[y] ?? 0) + 1
  }

  if (n === 0) return { kind: 'no-pairable-values' }
  if (n < MINIMUM_ITEMS) return { kind: 'too-few-items', n, minimum: MINIMUM_ITEMS }

  const rowTotals = table.map((row) => row.reduce((sum, count) => sum + count, 0))
  const columnTotals = table.map((_, y) => table.reduce((sum, row) => sum + (row[y] ?? 0), 0))
  let observed = 0
  let expected = 0
  table.forEach((row, x) => {
    row.forEach((count, y) => {
      const weight = disagreementWeight(weighting, x, y)
      observed += weight * count
      expected += (weight * (rowTotals[x] ?? 0) * (columnTotals[y] ?? 0)) / n
    })
  })

  // Both raters used one and the same category: chance explains everything, 0/0.
  if (expected === 0) return { kind: 'no-variation', n }
  return { kind: 'value', value: 1 - observed / expected, n }
}

// The disagreement weight of categories x and y (sklearn semantics). SPEC.md
// scales linear and quadratic by (k − 1), but that factor cancels in κ's
// ratio, so it is left out and a single category can't divide by zero.
function disagreementWeight(weighting: Weighting, x: number, y: number): number {
  switch (weighting) {
    case 'unweighted':
      return x === y ? 0 : 1
    case 'linear':
      return Math.abs(x - y)
    case 'quadratic':
      return (x - y) * (x - y)
  }
}

// A dataset's default weighting (SPEC.md, "Mean pairwise κ"): unweighted for
// nominal categories, quadratic for ordinal ones.
export function defaultWeighting(level: Level): Weighting {
  return level === 'ordinal' ? 'quadratic' : 'unweighted'
}

export type KappaPair = { a: number; b: number; result: MetricResult }

// Cohen's κ for every pair of raters, a < b, in rater order.
export function pairwiseKappa(dataset: Dataset, weighting: Weighting): KappaPair[] {
  const pairs: KappaPair[] = []
  dataset.raters.forEach((_, a) => {
    for (let b = a + 1; b < dataset.raters.length; b++) {
      pairs.push({ a, b, result: cohenKappa(dataset, a, b, weighting) })
    }
  })
  return pairs
}

// The mean of Cohen's κ over every rater pair (SPEC.md, "Mean pairwise κ").
export function meanPairwiseKappa(
  dataset: Dataset,
  weighting: Weighting = defaultWeighting(dataset.level),
): MetricResult {
  return meanKappa(pairwiseKappa(dataset, weighting))
}

// The mean of Cohen's κ over the given pairs that have a value; n counts those
// pairs. Pairs with too few shared items or no variation are left out. With
// no pair left, the result says why, taking the most informative reason: no
// variation if some pair had enough items but one category (n counting those
// pairs), else too few items (n the most items any pair shares, so the UI can
// say how far short the best pair falls), else nothing pairable.
export function meanKappa(pairs: readonly KappaPair[]): MetricResult {
  let sum = 0
  let counted = 0
  let noVariationPairs = 0
  let mostShared = 0
  for (const { result } of pairs) {
    if (result.kind === 'value') {
      sum += result.value
      counted += 1
    } else if (result.kind === 'no-variation') {
      noVariationPairs += 1
    } else if (result.kind === 'too-few-items') {
      mostShared = Math.max(mostShared, result.n)
    }
  }

  if (counted > 0) return { kind: 'value', value: sum / counted, n: counted }
  if (noVariationPairs > 0) return { kind: 'no-variation', n: noVariationPairs }
  if (mostShared > 0) return { kind: 'too-few-items', n: mostShared, minimum: MINIMUM_ITEMS }
  return { kind: 'no-pairable-values' }
}
