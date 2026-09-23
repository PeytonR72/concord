import type { Dataset } from '../dataset/dataset'

// A rating outside the categories breaks the Dataset contract: a caller bug,
// not a refusal of input, so it throws rather than skewing a metric.
export function checkCategory(dataset: Dataset, category: number): void {
  if (!Number.isInteger(category) || category < 0 || category >= dataset.categories.length) {
    throw new RangeError(`No category at index ${category}`)
  }
}

// The shared items of raters a and b: for each item both rated, in item
// order, the pair of their categories. Every rating either rater gave is
// checked, shared or not. A rater index outside the dataset throws.
export function sharedRatings(dataset: Dataset, a: number, b: number): [number, number][] {
  const first = dataset.ratings[a]
  const second = dataset.ratings[b]
  if (first === undefined || second === undefined) {
    throw new RangeError(`No rater at index ${first === undefined ? a : b}`)
  }

  const shared: [number, number][] = []
  dataset.items.forEach((_, item) => {
    const x = first[item] ?? null
    const y = second[item] ?? null
    if (x !== null) checkCategory(dataset, x)
    if (y !== null) checkCategory(dataset, y)
    if (x !== null && y !== null) shared.push([x, y])
  })
  return shared
}
