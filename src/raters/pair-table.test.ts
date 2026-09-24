import { describe, expect, test } from 'vitest'
import type { KappaPair } from '../metrics/cohen'
import { DEFAULT_PAIR_SORT, pairRows, sortPairRows, toggleSort } from './pair-table'

const raters = ['ann', 'bo', 'cy', 'di']
const pairs: KappaPair[] = [
  { a: 0, b: 1, result: { kind: 'value', value: 0.8, n: 40 } },
  { a: 0, b: 2, result: { kind: 'too-few-items', n: 6, minimum: 10 } },
  { a: 1, b: 2, result: { kind: 'value', value: -0.1, n: 12 } },
  { a: 0, b: 3, result: { kind: 'value', value: 0.4, n: 25 } },
  { a: 2, b: 3, result: { kind: 'no-pairable-values' } },
]
const rows = pairRows(raters, pairs)
const order = (sorted: ReturnType<typeof pairRows>) => sorted.map(({ a, b }) => `${a}${b}`)

describe('pairRows', () => {
  test('names both raters, and prints κ with its words and shared items', () => {
    expect(rows[0]).toEqual({
      a: 0,
      b: 1,
      first: 'ann',
      second: 'bo',
      kappa: 0.8,
      printed: '0.800',
      words: 'substantial',
      shared: 40,
    })
    expect(rows[1]).toMatchObject({ kappa: null, printed: 'N/A', shared: 6 })
    expect(rows[4]).toMatchObject({ kappa: null, shared: 0 })
  })
})

describe('sortPairRows', () => {
  test('by default the weakest pairs come first, pairs without κ last', () => {
    expect(order(sortPairRows(rows, DEFAULT_PAIR_SORT))).toEqual(['12', '03', '01', '02', '23'])
  })

  test('descending κ still puts pairs without κ last', () => {
    const sorted = sortPairRows(rows, { key: 'kappa', direction: 'descending' })
    expect(order(sorted)).toEqual(['01', '03', '12', '02', '23'])
  })

  test('by shared items, and by raters in rater order', () => {
    const shared = sortPairRows(rows, { key: 'shared', direction: 'descending' })
    expect(order(shared)).toEqual(['01', '03', '12', '02', '23'])
    const byRaters = sortPairRows(rows, { key: 'raters', direction: 'ascending' })
    expect(order(byRaters)).toEqual(['01', '02', '03', '12', '23'])
    const back = sortPairRows(rows, { key: 'raters', direction: 'descending' })
    expect(order(back)).toEqual(['23', '12', '03', '02', '01'])
  })

  test('does not reorder its input', () => {
    sortPairRows(rows, DEFAULT_PAIR_SORT)
    expect(order(rows)).toEqual(['01', '02', '12', '03', '23'])
  })
})

describe('toggleSort', () => {
  test('the same column flips its direction', () => {
    expect(toggleSort(DEFAULT_PAIR_SORT, 'kappa')).toEqual({
      key: 'kappa',
      direction: 'descending',
    })
  })

  test('a new column starts in its natural direction', () => {
    expect(toggleSort(DEFAULT_PAIR_SORT, 'shared')).toEqual({
      key: 'shared',
      direction: 'descending',
    })
    expect(toggleSort(DEFAULT_PAIR_SORT, 'raters')).toEqual({
      key: 'raters',
      direction: 'ascending',
    })
  })
})
