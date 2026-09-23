import { expect } from 'vitest'
import type { Dataset, Level } from '../dataset/dataset'
import exampleC from './krippendorff-2011-example-c.json'
import type { MetricResult } from './metric-result'

export const exampleCExpected = exampleC.expected

// Krippendorff (2011) example C, with value v as category index v − 1.
export function exampleCDataset(level: Level): Dataset {
  return {
    items: exampleC.ratings[0]?.map((_, index) => ({ id: `u${index + 1}` })) ?? [],
    raters: exampleC.ratings.map((_, index) => `c${index + 1}`),
    categories: exampleC.categories,
    level,
    ratings: exampleC.ratings.map((row) => row.map((value) => (value === null ? null : value - 1))),
  }
}

const A = 'a'.charCodeAt(0)

// Disagreeing, with missing ratings and items that drop out.
export const messy: readonly string[] = ['abcab.d', 'abccb.d', 'b.ca.ad', 'abdabb.']

// Test-only builders for small reliability matrices. Each row is one rater,
// each character one item: a letter is a category ('a' is index 0), and '.'
// is a missing rating.
export function fromRows(
  rows: readonly string[],
  options: { level?: Level; categories?: readonly string[] } = {},
): Dataset {
  const ratings = rows.map((row) =>
    [...row].map((cell) => (cell === '.' ? null : cell.charCodeAt(0) - A)),
  )
  const highest = Math.max(-1, ...ratings.flat().map((category) => category ?? -1))
  const categories =
    options.categories ??
    Array.from({ length: highest + 1 }, (_, index) => String.fromCharCode(A + index))
  const items = Array.from({ length: rows[0]?.length ?? 0 }, (_, index) => ({ id: `i${index}` }))
  return {
    items,
    raters: rows.map((_, index) => `r${index}`),
    categories,
    level: options.level ?? 'nominal',
    ratings,
  }
}

// The same data with the raters in reverse order.
export function reverseRaters(dataset: Dataset): Dataset {
  return { ...dataset, raters: [...dataset.raters].reverse(), ratings: [...dataset.ratings].reverse() }
}

// The same data with the items in the order `order` gives (old indices).
export function reorderItems(dataset: Dataset, order: readonly number[]): Dataset {
  return {
    ...dataset,
    items: order.map((index) => {
      const item = dataset.items[index]
      if (item === undefined) throw new RangeError(`No item at index ${index}`)
      return item
    }),
    ratings: dataset.ratings.map((row) => order.map((index) => row[index] ?? null)),
  }
}

// The same data with category c renamed to `mapping[c]`.
export function relabel(dataset: Dataset, mapping: readonly number[]): Dataset {
  const categories = [...dataset.categories]
  dataset.categories.forEach((name, index) => {
    categories[mapping[index] ?? index] = name
  })
  return {
    ...dataset,
    categories,
    ratings: dataset.ratings.map((row) =>
      row.map((category) => (category === null ? null : (mapping[category] ?? category))),
    ),
  }
}

// The value of a result that must have one.
export function value(result: MetricResult): number {
  if (result.kind !== 'value') throw new Error(`expected a value, got ${result.kind}`)
  return result.value
}

// Two results agree: same kind and n, and values equal up to summation order.
export function expectSame(actual: MetricResult, expected: MetricResult) {
  expect(actual.kind).toBe(expected.kind)
  if (actual.kind === 'value' && expected.kind === 'value') {
    expect(actual.value).toBeCloseTo(expected.value, 12)
    expect(actual.n).toBe(expected.n)
  } else {
    expect(actual).toEqual(expected)
  }
}
