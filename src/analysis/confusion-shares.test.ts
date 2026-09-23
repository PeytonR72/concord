import { describe, expect, test } from 'vitest'
import { coincidenceMatrix } from '../metrics/coincidence'
import { fromRows } from '../metrics/test-datasets'
import { confusionShares } from './confusion-shares'

function sharesOf(rows: readonly string[]) {
  return confusionShares(coincidenceMatrix(fromRows(rows)))
}

describe('confusionShares', () => {
  test('each confusion takes o_ck + o_kc over all off-diagonal mass', () => {
    // Two raters: each disagreeing item adds 1 to o_ck and 1 to o_kc.
    // {a,b} on two items, {a,c} and {b,c} on one each: 8 in all.
    expect(sharesOf(['aaabd', 'bbccd'])).toEqual([
      { a: 0, b: 1, pairings: 4, share: 0.5 },
      { a: 0, b: 2, pairings: 2, share: 0.25 },
      { a: 1, b: 2, pairings: 2, share: 0.25 },
    ])
  })

  test('largest first, ties to the lower category indices', () => {
    // {c,d}, {b,c} and {a,b} on one item each, listed in that order.
    expect(sharesOf(['cba', 'dcb'])).toEqual([
      { a: 0, b: 1, pairings: 2, share: 2 / 6 },
      { a: 1, b: 2, pairings: 2, share: 2 / 6 },
      { a: 2, b: 3, pairings: 2, share: 2 / 6 },
    ])
  })

  test('pairings equal up to rounding still tie', () => {
    // {a,b}: 2·(1·1/3 + 2·5/6) = 4, which sums to 3.9999999999999996.
    // {c,d}: two items rated c and d by two raters, exactly 4.
    const shares = sharesOf(['aacc', 'badd', 'eb..', 'eb..', '.b..', '.b..', '.b..'])
    expect(shares.slice(0, 2).map(({ a, b, pairings }) => [a, b, pairings])).toEqual([
      [0, 1, 3.9999999999999996],
      [2, 3, 4],
    ])
  })

  test('an item with m ratings weighs its pairs by 1/(m − 1)', () => {
    // Item 0 is a, a, b: o_ab = o_ba = 2·1/2. Item 1 is c, c, d likewise.
    expect(sharesOf(['ac', 'ac', 'bd'])).toEqual([
      { a: 0, b: 1, pairings: 2, share: 0.5 },
      { a: 2, b: 3, pairings: 2, share: 0.5 },
    ])
  })

  test('confusions nobody made are left out', () => {
    expect(sharesOf(['ab', 'ac']).map(({ a, b }) => [a, b])).toEqual([[1, 2]])
  })

  test('with no disagreement there are no shares, not a division by zero', () => {
    expect(sharesOf(['abab', 'abab'])).toEqual([])
  })

  test('the categories are listed with a < b whichever rater said which', () => {
    expect(sharesOf(['ba', 'ab'])).toEqual([{ a: 0, b: 1, pairings: 4, share: 1 }])
  })
})
