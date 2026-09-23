import { describe, expect, test } from 'vitest'
import type { Dataset, Level } from '../dataset/dataset'
import { fleissKappa, fleissKappaFromCounts } from './fleiss'
import wikipedia from './fleiss-wikipedia.json'
import { expectSame, fromRows, relabel, reorderItems, reverseRaters, value } from './test-datasets'

const levels: readonly Level[] = ['nominal', 'ordinal']

describe('fleissKappaFromCounts', () => {
  test('Wikipedia worked example: 10 subjects, 14 raters, 5 categories', () => {
    const result = fleissKappaFromCounts(wikipedia.counts)

    expect(value(result)).toBeCloseTo(wikipedia.expected.kappa, 4)
    expect(result).toMatchObject({ n: wikipedia.expected.n })
  })
})

// n items with the same count row.
function repeat(n: number, row: readonly number[]): number[][] {
  return Array.from({ length: n }, () => [...row])
}

describe('fleissKappaFromCounts: too little to go on', () => {
  test('no items: no pairable values', () => {
    expect(fleissKappaFromCounts([])).toEqual({ kind: 'no-pairable-values' })
  })

  test('one rater per item: no pairable values', () => {
    expect(fleissKappaFromCounts(repeat(12, [1, 0]))).toEqual({ kind: 'no-pairable-values' })
  })

  test('fewer than 10 items are too few, carrying n', () => {
    expect(fleissKappaFromCounts([...repeat(5, [3, 0]), ...repeat(4, [1, 2])])).toEqual({
      kind: 'too-few-items',
      n: 9,
      minimum: 10,
    })
  })

  test('10 items are enough', () => {
    expect(fleissKappaFromCounts([...repeat(5, [3, 0]), ...repeat(5, [0, 3])])).toEqual({
      kind: 'value',
      value: 1,
      n: 10,
    })
  })

  test('one category throughout: no variation', () => {
    expect(fleissKappaFromCounts(repeat(10, [0, 3]))).toEqual({ kind: 'no-variation', n: 10 })
  })

  test('refuses items rated by different numbers of raters', () => {
    expect(() => fleissKappaFromCounts([...repeat(9, [3, 0]), [1, 1]])).toThrow(RangeError)
  })
})

// The Wikipedia table as a reliability matrix: on each item, the raters in
// order give category 0 as many times as it counts, then category 1, and so on.
function wikipediaDataset(level: Level = 'nominal'): Dataset {
  const raters = wikipedia.counts[0]?.reduce((sum, count) => sum + count, 0) ?? 0
  const ratings = Array.from({ length: raters }, () => new Array<number | null>())
  for (const row of wikipedia.counts) {
    let rater = 0
    row.forEach((count, category) => {
      for (let copy = 0; copy < count; copy++) ratings[rater++]?.push(category)
    })
  }
  return {
    items: wikipedia.counts.map((_, index) => ({ id: `s${index + 1}` })),
    raters: ratings.map((_, index) => `r${index + 1}`),
    categories: wikipedia.categories,
    level,
    ratings,
  }
}

// The same data with extra items, each missing at least one rating.
function withIncompleteItems(dataset: Dataset): Dataset {
  return {
    ...dataset,
    items: [...dataset.items, { id: 'x1' }, { id: 'x2' }],
    ratings: dataset.ratings.map((row, rater) => [
      ...row,
      rater === 0 ? null : 0,
      rater % 2 === 0 ? 1 : null,
    ]),
  }
}

// Disagreeing over 4 categories, 11 of 12 items complete.
const longRows: readonly string[] = ['abcdabcdabca', 'abcdabddabc.', 'bbcdaacdbbcd']

describe('fleissKappa', () => {
  test('Wikipedia worked example as a reliability matrix', () => {
    const result = fleissKappa(wikipediaDataset())

    expect(value(result)).toBeCloseTo(wikipedia.expected.kappa, 4)
    expect(result).toMatchObject({ n: wikipedia.expected.n })
  })

  test('uses only the items every rater labelled', () => {
    const complete = wikipediaDataset()

    expectSame(fleissKappa(withIncompleteItems(complete)), fleissKappa(complete))
  })

  test('a rater with no ratings changes nothing', () => {
    const dataset = fromRows(longRows)
    const withSilentRater = {
      ...dataset,
      raters: [...dataset.raters, 'silent'],
      ratings: [...dataset.ratings, new Array<null>(12).fill(null)],
    }

    expectSame(fleissKappa(withSilentRater), fleissKappa(dataset))
  })

  test('is always nominal, even on an ordinal dataset', () => {
    expectSame(fleissKappa(wikipediaDataset('ordinal')), fleissKappa(wikipediaDataset()))
  })

  test('fewer than 10 complete items are too few, carrying n', () => {
    expect(fleissKappa(fromRows(['abababababab', 'abababab.bab', 'ab.babababa.']))).toEqual({
      kind: 'too-few-items',
      n: 9,
      minimum: 10,
    })
  })

  test('refuses a rating outside the categories', () => {
    const dataset = fromRows(longRows, { categories: ['a', 'b'] })

    expect(() => fleissKappa(dataset)).toThrow(RangeError)
  })
})

describe('fleissKappa: properties', () => {
  test('perfect agreement gives 1', () => {
    expect(fleissKappa(fromRows(['abcdabcdab.c', 'abcdabcdabdc', 'abcdabcdabcc']))).toEqual({
      kind: 'value',
      value: 1,
      n: 11,
    })
  })

  test('swapping raters leaves the value unchanged', () => {
    const dataset = fromRows(longRows)

    expectSame(fleissKappa(reverseRaters(dataset)), fleissKappa(dataset))
  })

  test('permuting items leaves the value unchanged', () => {
    const dataset = fromRows(longRows)

    const order = [11, 3, 0, 6, 1, 9, 5, 2, 8, 4, 10, 7]

    expectSame(fleissKappa(reorderItems(dataset, order)), fleissKappa(dataset))
  })

  test.each(levels)('%s: relabelling categories consistently leaves the value unchanged', (level) => {
    const dataset = fromRows(longRows, { level })

    for (const mapping of [
      [3, 2, 1, 0],
      [1, 3, 0, 2],
    ]) {
      expectSame(fleissKappa(relabel(dataset, mapping)), fleissKappa(dataset))
    }
  })

  test('a constant dataset has no variation', () => {
    expect(fleissKappa(fromRows(['aaaaaaaaaa.', 'aaaaaaaaaaa', 'aaaaaaaaaaa']))).toEqual({
      kind: 'no-variation',
      n: 10,
    })
  })
})

describe('fleissKappa: nothing to compute on', () => {
  const empty: readonly [string, Dataset][] = [
    ['no complete item', fromRows(['ab..', '..ab'])],
    ['a single rater', fromRows(['ababababab'])],
    ['no raters', { ...fromRows([''], { categories: ['a', 'b'] }), raters: [], ratings: [] }],
    ['no items', fromRows(['', ''], { categories: ['a', 'b'] })],
  ]

  test.each(empty)('%s', (_, dataset) => {
    expect(fleissKappa(dataset)).toEqual({ kind: 'no-pairable-values' })
  })
})
