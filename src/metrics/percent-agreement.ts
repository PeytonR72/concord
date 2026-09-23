import type { Dataset } from '../dataset/dataset'
import { pairableItems } from './coincidence'
import type { MetricResult } from './metric-result'

// Overall percent agreement: the mean over items with at least two ratings of
// P_i, the share of the item's rater pairs that agree. n counts those items.
// It ignores chance, so a constant dataset scores 1 rather than no-variation.
export function percentAgreement(dataset: Dataset): MetricResult {
  const items = pairableItems(dataset)
  if (items.length === 0) return { kind: 'no-pairable-values' }

  let sum = 0
  for (const { byCategory, total } of items) {
    let agreeing = 0
    for (const { count } of byCategory) agreeing += count * (count - 1)
    sum += agreeing / (total * (total - 1))
  }
  return { kind: 'value', value: sum / items.length, n: items.length }
}

// Pair percent agreement: how often raters a and b chose the same category,
// over the items both rated. n counts those shared items. A rater index
// outside the dataset is a caller bug, not a refusal of input, so it throws.
export function pairPercentAgreement(dataset: Dataset, a: number, b: number): MetricResult {
  const first = dataset.ratings[a]
  const second = dataset.ratings[b]
  if (first === undefined || second === undefined) {
    throw new RangeError(`No rater at index ${first === undefined ? a : b}`)
  }

  let shared = 0
  let matching = 0
  dataset.items.forEach((_, item) => {
    const x = first[item] ?? null
    const y = second[item] ?? null
    if (x === null || y === null) return
    shared += 1
    if (x === y) matching += 1
  })

  if (shared === 0) return { kind: 'no-pairable-values' }
  return { kind: 'value', value: matching / shared, n: shared }
}
