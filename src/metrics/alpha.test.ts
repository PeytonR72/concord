import { describe, expect, test } from 'vitest'
import type { Dataset, Level } from '../dataset/dataset'
import { alpha } from './alpha'
import {
  exampleCDataset,
  exampleCExpected,
  expectSame,
  fromRows,
  messy,
  relabel,
  reorderItems,
  reverseRaters,
  value,
} from './test-datasets'

const levels: readonly Level[] = ['nominal', 'ordinal']

describe('alpha: Krippendorff (2011) example C', () => {
  test('nominal', () => {
    const result = alpha(exampleCDataset('nominal'))

    expect(value(result)).toBeCloseTo(exampleCExpected.nominal, 4)
    expect(result).toMatchObject({ n: exampleCExpected.pairableValues })
  })

  test('ordinal', () => {
    const result = alpha(exampleCDataset('ordinal'))

    expect(value(result)).toBeCloseTo(exampleCExpected.ordinal, 4)
    expect(result).toMatchObject({ n: exampleCExpected.pairableValues })
  })
})

describe('alpha: properties', () => {
  test.each(levels)('%s: perfect agreement gives 1', (level) => {
    expect(alpha(fromRows(['abcab.', 'abc.bc', 'a.cab.'], { level }))).toEqual({
      kind: 'value',
      value: 1,
      n: 13,
    })
  })

  test.each(levels)('%s: swapping raters leaves the value unchanged', (level) => {
    const dataset = fromRows(messy, { level })

    expectSame(alpha(reverseRaters(dataset)), alpha(dataset))
  })

  test.each(levels)('%s: permuting items leaves the value unchanged', (level) => {
    const dataset = fromRows(messy, { level })

    for (const order of [
      [6, 5, 4, 3, 2, 1, 0],
      [3, 0, 6, 1, 5, 2, 4],
    ]) {
      expectSame(alpha(reorderItems(dataset, order)), alpha(dataset))
    }
  })

  test('nominal: relabelling categories consistently leaves the value unchanged', () => {
    const dataset = fromRows(messy)

    for (const mapping of [
      [3, 2, 1, 0],
      [1, 3, 0, 2],
    ]) {
      expectSame(alpha(relabel(dataset, mapping)), alpha(dataset))
    }
  })

  test('ordinal: relabelling changes the value, because order carries meaning', () => {
    const dataset = fromRows(messy, { level: 'ordinal' })

    expect(value(alpha(relabel(dataset, [1, 3, 0, 2])))).not.toBeCloseTo(value(alpha(dataset)), 4)
  })

  test.each(levels)('%s: a constant dataset has no variation', (level) => {
    expect(alpha(fromRows(['aaa.', 'aa.a', '.aaa'], { level }))).toEqual({
      kind: 'no-variation',
      n: 9,
    })
  })

  test.each(levels)('%s: one category among pairable values has no variation', (level) => {
    // 'b' only ever appears alone on an item, so it never becomes pairable.
    expect(alpha(fromRows(['aab', 'aa.'], { level }))).toEqual({ kind: 'no-variation', n: 4 })
  })
})

describe('alpha: nothing to compute on', () => {
  const empty: readonly [string, Dataset][] = [
    ['no item has two ratings', fromRows(['a.b', '.a.'])],
    ['a single rater', fromRows(['abab'])],
    ['no raters', { ...fromRows([''], { categories: ['a', 'b'] }), raters: [], ratings: [] }],
    ['no items', fromRows(['', ''], { categories: ['a', 'b'] })],
    ['every rating missing', fromRows(['...', '...'], { categories: ['a', 'b'] })],
  ]

  test.each(empty)('%s', (_, dataset) => {
    expect(alpha(dataset)).toEqual({ kind: 'no-pairable-values' })
  })

  test('a rater with no ratings changes nothing', () => {
    expectSame(alpha(fromRows([...messy, '.......'])), alpha(fromRows(messy)))
  })
})

describe('alpha: ordinal categories nobody used', () => {
  test('an unused category between two used ones leaves the value unchanged', () => {
    const withGap = fromRows(['acca', 'aacc'], { level: 'ordinal', categories: ['a', 'b', 'c'] })
    const withoutGap = fromRows(['abba', 'aabb'], { level: 'ordinal', categories: ['a', 'b'] })

    expectSame(alpha(withGap), alpha(withoutGap))
  })

  test('unused categories at either end leave the value unchanged', () => {
    const padded = fromRows(['bccb', 'bbcc'], {
      level: 'ordinal',
      categories: ['a', 'b', 'c', 'd'],
    })
    const bare = fromRows(['abba', 'aabb'], { level: 'ordinal', categories: ['a', 'b'] })

    expectSame(alpha(padded), alpha(bare))
  })
})
