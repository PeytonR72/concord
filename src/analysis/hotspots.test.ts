import { describe, expect, test } from 'vitest'
import type { Dataset } from '../dataset/dataset'
import { fromRows, reorderItems, reverseRaters } from '../metrics/test-datasets'
import { drillDown, hotspots } from './hotspots'

function withIds(dataset: Dataset, ids: readonly string[]): Dataset {
  return { ...dataset, items: ids.map((id) => ({ id })) }
}

// Items x, y, z, b, B, w. x agrees; y is three ways split; z is two to one;
// b and B are split between two raters; w has one rating and drops out.
const nominal = withIds(fromRows(['aaaaba', 'ababa.', 'acb...']), ['x', 'y', 'z', 'b', 'B', 'w'])

function ranked(dataset: Dataset) {
  return hotspots(dataset).map(({ item, disagreement }) => [dataset.items[item]?.id, disagreement])
}

describe('hotspots: nominal', () => {
  test('ranks by 1 − P_i, then more ratings first, then item id by code unit', () => {
    // 'B' (U+0042) sorts before 'b' (U+0062), whatever the locale says.
    expect(ranked(nominal)).toEqual([
      ['y', 1],
      ['B', 1],
      ['b', 1],
      ['z', 2 / 3],
      ['x', 0],
    ])
  })

  test('carries each item’s tally for the distribution bar', () => {
    expect(hotspots(nominal)[0]).toEqual({
      item: 1,
      disagreement: 1,
      total: 3,
      byCategory: [
        { category: 0, count: 1 },
        { category: 1, count: 1 },
        { category: 2, count: 1 },
      ],
    })
  })

  test('the ranking ignores rater and item order', () => {
    const shuffled = reorderItems(reverseRaters(nominal), [5, 3, 1, 4, 0, 2])
    expect(ranked(shuffled)).toEqual(ranked(nominal))
  })

  test('with no pairable item there are no hotspots', () => {
    expect(hotspots(fromRows(['a.', '.b']))).toEqual([])
  })
})

describe('hotspots: ordinal', () => {
  // Categories a < b < c < d. Item 0 is a, d; item 1 a, a, d; item 2 a, b, c;
  // item 3 b, d; item 4 a, c.
  const ordinal = fromRows(['aaaba', 'dabdc', '.dc..'], { level: 'ordinal' })

  test('ties go to more ratings, then item id, whatever the item order', () => {
    // Items 1, 3 and 4 tie at 2. Reversed, with ids renamed so the id order
    // runs against the index order, the tie-breaks alone decide.
    const reversed = withIds(reorderItems(ordinal, [4, 3, 2, 1, 0]), ['q', 'p', 'r', 's', 't'])
    expect(ranked(reversed)).toEqual([
      ['t', 3],
      ['s', 2],
      ['p', 2],
      ['q', 2],
      ['r', 4 / 3],
    ])
  })

  test('ranks by mean |i − j| over the item’s pairs of ratings', () => {
    // Item 2 disagrees on every pair, but only by one or two steps: nominally
    // it would tie item 0 at the top, ordinally it comes last.
    expect(ranked(ordinal)).toEqual([
      ['i0', 3],
      ['i1', 6 / 3],
      ['i3', 2],
      ['i4', 2],
      ['i2', 4 / 3],
    ])
  })
})

describe('drillDown', () => {
  const ranking = hotspots(nominal)
  const ids = (confusion: { a: number; b: number }) =>
    drillDown(ranking, confusion).map(({ item }) => nominal.items[item]?.id)

  test('lists the items where one rater said a and another b, in hotspot order', () => {
    expect(ids({ a: 0, b: 1 })).toEqual(['y', 'B', 'b', 'z'])
    expect(ids({ a: 0, b: 2 })).toEqual(['y'])
  })

  test('either order of the two categories selects the same items', () => {
    expect(ids({ a: 1, b: 0 })).toEqual(ids({ a: 0, b: 1 }))
  })

  test('a confusion nobody made lists nothing', () => {
    expect(ids({ a: 1, b: 3 })).toEqual([])
  })

  test('one category twice is not a confusion', () => {
    expect(() => drillDown(ranking, { a: 1, b: 1 })).toThrow(RangeError)
  })
})
