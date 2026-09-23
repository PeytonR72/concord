import { describe, expect, test } from 'vitest'
import type { Dataset } from '../dataset/dataset'
import { cohenKappa, meanPairwiseKappa, pairwiseKappa, type Weighting } from './cohen'
import sklearn from './cohen-sklearn.json'
import wikipedia from './cohen-wikipedia.json'
import { expectSame, fromRows, relabel, reorderItems, reverseRaters, value } from './test-datasets'

// Two raters from a contingency table: table[x][y] items where rater 0 chose
// category x and rater 1 chose category y.
function fromTable(table: readonly (readonly number[])[], categories: readonly string[]): Dataset {
  const first: number[] = []
  const second: number[] = []
  table.forEach((row, x) => {
    row.forEach((count, y) => {
      for (let copy = 0; copy < count; copy++) {
        first.push(x)
        second.push(y)
      }
    })
  })
  return {
    items: first.map((_, index) => ({ id: `i${index}` })),
    raters: ['A', 'B'],
    categories,
    level: 'nominal',
    ratings: [first, second],
  }
}

describe('cohenKappa: reference fixtures', () => {
  test('Wikipedia worked example: p_o = 0.70, p_e = 0.50', () => {
    const result = cohenKappa(fromTable(wikipedia.table, wikipedia.categories), 0, 1, 'unweighted')

    expect(value(result)).toBeCloseTo(wikipedia.expected.kappa, 12)
    expect(result).toMatchObject({ n: wikipedia.expected.n })
  })
})

// The sklearn fixture's two raters, with value v as category index v − 1.
function sklearnDataset(): Dataset {
  return {
    items: sklearn.a.map((_, index) => ({ id: `i${index}` })),
    raters: ['a', 'b'],
    categories: sklearn.categories,
    level: 'ordinal',
    ratings: [sklearn.a.map((v) => v - 1), sklearn.b.map((v) => v - 1)],
  }
}

const weightings: readonly Weighting[] = ['unweighted', 'linear', 'quadratic']

describe('cohenKappa: sklearn cross-check', () => {
  test.each(weightings)('%s', (weighting) => {
    const result = cohenKappa(sklearnDataset(), 0, 1, weighting)

    expect(value(result)).toBeCloseTo(sklearn.expected[weighting], 6)
    expect(result).toMatchObject({ n: sklearn.expected.n })
  })
})

describe('cohenKappa: too little to go on', () => {
  test('raters who share no item have no pairable values', () => {
    expect(cohenKappa(fromRows(['ab..', '..ab']), 0, 1, 'unweighted')).toEqual({
      kind: 'no-pairable-values',
    })
  })

  test('fewer than 10 shared items are too few, carrying n', () => {
    // 9 shared items; the tenth is rated by rater 0 only.
    expect(cohenKappa(fromRows(['ababababab', 'ababababa.']), 0, 1, 'unweighted')).toEqual({
      kind: 'too-few-items',
      n: 9,
      minimum: 10,
    })
  })

  test('10 shared items are enough', () => {
    expect(cohenKappa(fromRows(['ababababab', 'ababababab']), 0, 1, 'unweighted')).toEqual({
      kind: 'value',
      value: 1,
      n: 10,
    })
  })

  test.each(weightings)('%s: a constant pair has no variation', (weighting) => {
    expect(cohenKappa(fromRows(['aaaaaaaaaaa', 'aaaaaaaaaa.']), 0, 1, weighting)).toEqual({
      kind: 'no-variation',
      n: 10,
    })
  })

  test('refuses a rater index outside the dataset', () => {
    expect(() => cohenKappa(fromRows(['ab', 'ab']), 0, 2, 'unweighted')).toThrow(RangeError)
  })

  test('refuses a rating outside the categories', () => {
    const dataset = fromRows(['ababababab', 'ababababab'], { categories: ['a'] })

    expect(() => cohenKappa(dataset, 0, 1, 'unweighted')).toThrow(RangeError)
  })

  test('refuses a rating outside the categories on an item only one rater labelled', () => {
    const dataset = fromRows(['abababababc', 'ababababab.'], { categories: ['a', 'b'] })

    expect(() => cohenKappa(dataset, 0, 1, 'unweighted')).toThrow(RangeError)
  })
})

// Disagreeing, with missing ratings; every pair shares at least 10 items.
const longMessy: readonly string[] = ['abcabdacbdab.c', 'abccbdabbd.bac', 'bbcaadacbdabcd']

describe('cohenKappa: properties', () => {
  test.each(weightings)('%s: perfect agreement gives 1', (weighting) => {
    expect(cohenKappa(fromRows(['abcdabcdab.c', 'abcdabcdabdc']), 0, 1, weighting)).toEqual({
      kind: 'value',
      value: 1,
      n: 11,
    })
  })

  test.each(weightings)('%s: swapping the two raters leaves the value unchanged', (weighting) => {
    const dataset = fromRows(longMessy, { level: 'ordinal' })

    expectSame(cohenKappa(dataset, 1, 0, weighting), cohenKappa(dataset, 0, 1, weighting))
    expectSame(
      cohenKappa(reverseRaters(dataset), 0, 2, weighting),
      cohenKappa(dataset, 2, 0, weighting),
    )
  })

  test.each(weightings)('%s: permuting items leaves the value unchanged', (weighting) => {
    const dataset = fromRows(longMessy, { level: 'ordinal' })
    const order = [13, 3, 0, 11, 6, 1, 9, 5, 12, 2, 8, 4, 10, 7]

    expectSame(
      cohenKappa(reorderItems(dataset, order), 0, 1, weighting),
      cohenKappa(dataset, 0, 1, weighting),
    )
  })

  test('unweighted: relabelling categories consistently leaves the value unchanged', () => {
    const dataset = fromRows(longMessy)

    for (const mapping of [
      [3, 2, 1, 0],
      [1, 3, 0, 2],
    ]) {
      expectSame(
        cohenKappa(relabel(dataset, mapping), 0, 2, 'unweighted'),
        cohenKappa(dataset, 0, 2, 'unweighted'),
      )
    }
  })

  test('weighted: relabelling changes the value, because order carries meaning', () => {
    const dataset = fromRows(longMessy, { level: 'ordinal' })

    for (const weighting of ['linear', 'quadratic'] satisfies Weighting[]) {
      expect(value(cohenKappa(relabel(dataset, [1, 3, 0, 2]), 0, 2, weighting))).not.toBeCloseTo(
        value(cohenKappa(dataset, 0, 2, weighting)),
        4,
      )
    }
  })
})

describe('cohenKappa: ordinal categories nobody used', () => {
  const bare = fromRows(['abcabcabac', 'abcbacabbc'], {
    level: 'ordinal',
    categories: ['a', 'b', 'c'],
  })

  test.each(weightings)('%s: unused categories at either end leave the value unchanged', (weighting) => {
    const padded = fromRows(['bcdbcdbcbd', 'bcdcbdbccd'], {
      level: 'ordinal',
      categories: ['a', 'b', 'c', 'd', 'e'],
    })

    expectSame(cohenKappa(padded, 0, 1, weighting), cohenKappa(bare, 0, 1, weighting))
  })

  test('linear: an unused category between used ones still counts towards distance', () => {
    // The full order keeps 'c' between 'b' and 'd', unlike sklearn without labels=.
    const withGap = fromRows(['abdabdabad', 'abdbadabbd'], {
      level: 'ordinal',
      categories: ['a', 'b', 'c', 'd'],
    })

    expect(value(cohenKappa(withGap, 0, 1, 'linear'))).not.toBeCloseTo(
      value(cohenKappa(bare, 0, 1, 'linear')),
      4,
    )
  })
})

describe('meanPairwiseKappa', () => {
  // r0 and r1 agree perfectly (κ = 1). r2 swaps the last two items against
  // both: p_o = 0.8, p_e = 0.5, κ = 0.6.
  const three = ['ababababab', 'ababababab', 'ababababba']

  test('is the mean of κ over rater pairs, n counting the pairs', () => {
    const result = meanPairwiseKappa(fromRows(three))

    expect(result).toMatchObject({ kind: 'value', n: 3 })
    expect(value(result)).toBeCloseTo((1 + 0.6 + 0.6) / 3, 12)
  })

  test('leaves out pairs with too few shared items', () => {
    const result = meanPairwiseKappa(fromRows([...three, 'abab......']))

    expect(result).toMatchObject({ kind: 'value', n: 3 })
    expect(value(result)).toBeCloseTo((1 + 0.6 + 0.6) / 3, 12)
  })

  test('nominal defaults to unweighted, ordinal to quadratic', () => {
    const nominal = fromRows(longMessy)
    const ordinal = fromRows(longMessy, { level: 'ordinal' })

    expectSame(meanPairwiseKappa(nominal), meanPairwiseKappa(nominal, 'unweighted'))
    expectSame(meanPairwiseKappa(ordinal), meanPairwiseKappa(ordinal, 'quadratic'))
    expect(value(meanPairwiseKappa(ordinal))).not.toBeCloseTo(value(meanPairwiseKappa(nominal)), 4)
  })

  test('sklearn fixture: the one pair is the mean', () => {
    const dataset = sklearnDataset()

    expect(value(meanPairwiseKappa(dataset))).toBeCloseTo(sklearn.expected.quadratic, 6)
    expect(value(meanPairwiseKappa(dataset, 'linear'))).toBeCloseTo(sklearn.expected.linear, 6)
  })

  test('perfect agreement gives 1', () => {
    expect(meanPairwiseKappa(fromRows(['abcdabcdab.c', 'abcdabcdabdc', 'abcdabcd.bdc']))).toEqual({
      kind: 'value',
      value: 1,
      n: 3,
    })
  })

  test('swapping raters or permuting items leaves the value unchanged', () => {
    const dataset = fromRows(longMessy, { level: 'ordinal' })
    const order = [13, 3, 0, 11, 6, 1, 9, 5, 12, 2, 8, 4, 10, 7]

    expectSame(meanPairwiseKappa(reverseRaters(dataset)), meanPairwiseKappa(dataset))
    expectSame(meanPairwiseKappa(reorderItems(dataset, order)), meanPairwiseKappa(dataset))
  })

  test('nominal: relabelling categories consistently leaves the value unchanged', () => {
    const dataset = fromRows(longMessy)

    expectSame(meanPairwiseKappa(relabel(dataset, [1, 3, 0, 2])), meanPairwiseKappa(dataset))
  })

  test('only constant pairs: no variation, n counting them', () => {
    expect(meanPairwiseKappa(fromRows(['aaaaaaaaaa', 'aaaaaaaaaa', 'aaaaaaaaaa']))).toEqual({
      kind: 'no-variation',
      n: 3,
    })
  })

  test('every pair too few: too few items, n the most any pair shares', () => {
    expect(meanPairwiseKappa(fromRows(['abababab..', 'ababab.b..', 'aba.......']))).toEqual({
      kind: 'too-few-items',
      n: 7,
      minimum: 10,
    })
  })

  const empty: readonly [string, Dataset][] = [
    ['no pair shares an item', fromRows(['ab..', '..ab'])],
    ['a single rater', fromRows(['ababababab'])],
  ]

  test.each(empty)('%s: no pairable values', (_, dataset) => {
    expect(meanPairwiseKappa(dataset)).toEqual({ kind: 'no-pairable-values' })
  })
})

describe('pairwiseKappa', () => {
  test('gives every rater pair once, a < b, in rater order', () => {
    const dataset = fromRows(['ababababab', 'ababababab', 'ababababba', 'abab......'])

    expect(pairwiseKappa(dataset, 'unweighted').map(({ a, b, result }) => [a, b, result.kind])).toEqual([
      [0, 1, 'value'],
      [0, 2, 'value'],
      [0, 3, 'too-few-items'],
      [1, 2, 'value'],
      [1, 3, 'too-few-items'],
      [2, 3, 'too-few-items'],
    ])
  })
})
