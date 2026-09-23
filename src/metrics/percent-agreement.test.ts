import { describe, expect, test } from 'vitest'
import type { Dataset } from '../dataset/dataset'
import { pairPercentAgreement, percentAgreement } from './percent-agreement'
import {
  exampleCDataset,
  expectSame,
  fromRows,
  messy,
  relabel,
  reorderItems,
  reverseRaters,
  value,
} from './test-datasets'

describe('percentAgreement (overall)', () => {
  test('is the mean over items of the share of agreeing rater pairs', () => {
    // Item 0: a, a, b agrees on 1 of 3 pairs. Item 1: a, b on 0 of 1.
    // Item 2: c alone is dropped. Item 3: b, b, b agrees on all 3.
    const result = percentAgreement(fromRows(['aacb', 'ab.b', 'b..b']))

    expect(result.kind).toBe('value')
    expect(result).toMatchObject({ n: 3 })
    expect(value(result)).toBeCloseTo((1 / 3 + 0 + 1) / 3, 12)
  })

  test('Krippendorff (2011) example C: 9 of 11 pairable items', () => {
    const result = percentAgreement(exampleCDataset('nominal'))

    expect(result).toMatchObject({ kind: 'value', n: 11 })
    expect(value(result)).toBeCloseTo(9 / 11, 12)
  })

  test('perfect agreement gives 1', () => {
    expect(percentAgreement(fromRows(['abcab.', 'abc.bc', 'a.cab.']))).toEqual({
      kind: 'value',
      value: 1,
      n: 5,
    })
  })

  test('a constant dataset gives 1, since percent agreement ignores chance', () => {
    expect(percentAgreement(fromRows(['aaa.', 'aa.a', '.aaa']))).toEqual({
      kind: 'value',
      value: 1,
      n: 4,
    })
  })

  test('swapping raters, permuting items or relabelling leaves the value unchanged', () => {
    const dataset = fromRows(messy)
    const expected = percentAgreement(dataset)

    expectSame(percentAgreement(reverseRaters(dataset)), expected)
    expectSame(percentAgreement(reorderItems(dataset, [3, 0, 6, 1, 5, 2, 4])), expected)
    expectSame(percentAgreement(relabel(dataset, [1, 3, 0, 2])), expected)
    expectSame(percentAgreement(relabel({ ...dataset, level: 'ordinal' }, [3, 2, 1, 0])), expected)
  })

  const empty: readonly [string, Dataset][] = [
    ['no item has two ratings', fromRows(['a.b', '.a.'])],
    ['a single rater', fromRows(['abab'])],
    ['no items', fromRows(['', ''], { categories: ['a', 'b'] })],
  ]

  test.each(empty)('%s: no pairable values', (_, dataset) => {
    expect(percentAgreement(dataset)).toEqual({ kind: 'no-pairable-values' })
  })
})

describe('pairPercentAgreement', () => {
  test('is the match rate over items both raters labelled', () => {
    // Shared items: 0 (a, a), 1 (b, c) and 2 (a, a). Items 3 and 4 are not shared.
    const result = pairPercentAgreement(fromRows(['aba.c', 'acaa.']), 0, 1)

    expect(result).toMatchObject({ kind: 'value', n: 3 })
    expect(value(result)).toBeCloseTo(2 / 3, 12)
  })

  test('Krippendorff (2011) example C: coders 1 and 2 match on 8 of 9 shared units', () => {
    const result = pairPercentAgreement(exampleCDataset('nominal'), 0, 1)

    expect(result).toMatchObject({ kind: 'value', n: 9 })
    expect(value(result)).toBeCloseTo(8 / 9, 12)
  })

  test('ignores the other raters', () => {
    const result = pairPercentAgreement(fromRows(['abab', 'abba', 'bbbb']), 0, 1)

    expect(result).toEqual({ kind: 'value', value: 0.5, n: 4 })
  })

  test('is symmetric in the two raters', () => {
    const dataset = fromRows(messy)

    const pairs: readonly [number, number][] = [
      [0, 1],
      [1, 3],
      [2, 3],
    ]
    for (const [a, b] of pairs) {
      expect(pairPercentAgreement(dataset, a, b)).toEqual(pairPercentAgreement(dataset, b, a))
    }
  })

  test('permuting items or relabelling leaves the value unchanged', () => {
    const dataset = fromRows(messy)
    const expected = pairPercentAgreement(dataset, 0, 3)

    expectSame(pairPercentAgreement(reorderItems(dataset, [3, 0, 6, 1, 5, 2, 4]), 0, 3), expected)
    expectSame(pairPercentAgreement(relabel(dataset, [1, 3, 0, 2]), 0, 3), expected)
  })

  test('a constant pair gives 1', () => {
    expect(pairPercentAgreement(fromRows(['aa.a', 'a.aa']), 0, 1)).toEqual({
      kind: 'value',
      value: 1,
      n: 2,
    })
  })

  test('raters who share no item have no pairable values', () => {
    expect(pairPercentAgreement(fromRows(['ab..', '..ab']), 0, 1)).toEqual({
      kind: 'no-pairable-values',
    })
  })

  test('refuses a rater index outside the dataset', () => {
    expect(() => pairPercentAgreement(fromRows(['ab', 'ab']), 0, 2)).toThrow(RangeError)
  })

  test('refuses a rating outside the categories', () => {
    const dataset = fromRows(['abc', 'ab.'], { categories: ['a', 'b'] })

    expect(() => pairPercentAgreement(dataset, 0, 1)).toThrow(RangeError)
  })
})
