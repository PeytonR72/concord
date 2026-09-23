import type { Dataset } from '../dataset/dataset'
import { checkCategory } from './ratings'

// One item's non-missing ratings, tallied by category.
export type ItemTally = {
  // The item's index in `dataset.items`.
  item: number
  byCategory: readonly { category: number; count: number }[]
  // Ratings on the item (m).
  total: number
}

// The tally of every item with at least two ratings, the only items whose
// values are pairable. Items with fewer drop out here. A rating outside the
// categories breaks the Dataset contract, so it throws rather than skewing n.
export function pairableItems(dataset: Dataset): ItemTally[] {
  const tallies: ItemTally[] = []
  dataset.items.forEach((_, item) => {
    const counts = new Map<number, number>()
    let total = 0
    for (const row of dataset.ratings) {
      const category = row[item] ?? null
      if (category === null) continue
      checkCategory(dataset, category)
      counts.set(category, (counts.get(category) ?? 0) + 1)
      total += 1
    }
    if (total >= 2) {
      const byCategory = [...counts].map(([category, count]) => ({ category, count }))
      tallies.push({ item, byCategory, total })
    }
  })
  return tallies
}

export type CoincidenceMatrix = {
  // k × k over every category, used or not: counts[c][k] is o_ck.
  counts: number[][]
  // n_c: pairable values of category c (the row sums of counts).
  marginals: number[]
  // n: every pairable value, the matrix's total.
  pairableValues: number
}

// Krippendorff's coincidence matrix (SPEC.md, "Coincidence matrix"): each
// pairable item contributes every ordered pair of its ratings with weight
// 1/(m − 1), so the matrix is symmetric and each item adds m to the total.
export function coincidenceMatrix(dataset: Dataset): CoincidenceMatrix {
  const k = dataset.categories.length
  const counts = Array.from({ length: k }, () => new Array<number>(k).fill(0))
  const marginals = new Array<number>(k).fill(0)
  let pairableValues = 0

  for (const { byCategory, total } of pairableItems(dataset)) {
    const weight = 1 / (total - 1)
    for (const { category: c, count: nc } of byCategory) {
      const row = counts[c]
      if (row === undefined) continue
      for (const { category: d, count: nd } of byCategory) {
        // Ordered pairs of distinct ratings: nc·nd across categories, nc·(nc − 1) within one.
        row[d] = (row[d] ?? 0) + (c === d ? nc * (nc - 1) : nc * nd) * weight
      }
      marginals[c] = (marginals[c] ?? 0) + nc
    }
    pairableValues += total
  }

  return { counts, marginals, pairableValues }
}
