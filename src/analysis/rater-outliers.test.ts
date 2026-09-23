import { describe, expect, test } from 'vitest'
import { alpha } from '../metrics/alpha'
import { cohenKappa } from '../metrics/cohen'
import { fromRows, value, valued } from '../metrics/test-datasets'
import { flagsOutlier, raterOutliers } from './rater-outliers'

describe('flagsOutlier: leave-one-out α at least 0.05 above α', () => {
  test.each([
    [0.6, 0.65, true],
    // 0.7 − 0.65 is 0.04999999999999993 in floating point: still 0.05.
    [0.65, 0.7, true],
    [0.6, 0.6499, false],
    [0.6, 0.9, true],
    [0.6, 0.55, false],
  ])('α %f, leave-one-out %f: %s', (full, leaveOneOut, flagged) => {
    expect(flagsOutlier(valued(full), valued(leaveOneOut))).toBe(flagged)
  })

  test('nothing is flagged unless both are values', () => {
    expect(flagsOutlier(valued(0.2), { kind: 'no-variation', n: 20 })).toBe(false)
    expect(flagsOutlier(valued(0.2), { kind: 'no-pairable-values' })).toBe(false)
    expect(flagsOutlier({ kind: 'no-variation', n: 20 }, valued(0.9))).toBe(false)
    expect(flagsOutlier(valued(0.2), null)).toBe(false)
  })
})

describe('raterOutliers', () => {
  // r0 and r1 agree on all 12 items; r2 agrees with them on half.
  const dataset = fromRows(['abababababab', 'abababababab', 'aabbaabbaabb'])
  const outliers = raterOutliers(dataset)

  test('flags the rater whose removal raises α by at least 0.05', () => {
    expect(outliers.map(({ rater, flagged }) => [rater, flagged])).toEqual([
      [0, false],
      [1, false],
      [2, true],
    ])
    expect(outliers[2]?.leaveOneOutAlpha).toEqual({ kind: 'value', value: 1, n: 24 })
  })

  test('leave-one-out α is α on the dataset without that rater', () => {
    const withoutFirst = fromRows(['abababababab', 'aabbaabbaabb'])
    expect(outliers[0]?.leaveOneOutAlpha).toEqual(alpha(withoutFirst))
  })

  test('each rater’s mean κ is over the pairs they are in', () => {
    const expected =
      (value(cohenKappa(dataset, 0, 1, 'unweighted')) +
        value(cohenKappa(dataset, 0, 2, 'unweighted'))) /
      2
    expect(outliers[0]?.meanKappa).toEqual({ kind: 'value', value: expected, n: 2 })
  })

  test('mean κ takes the weighting it is given', () => {
    const ordinal = fromRows(['abcabcabcabc', 'abcabcabcabc', 'accaccaccacc'], { level: 'ordinal' })
    const [first] = raterOutliers(ordinal, 'linear')
    const expected =
      (value(cohenKappa(ordinal, 0, 1, 'linear')) + value(cohenKappa(ordinal, 0, 2, 'linear'))) / 2
    expect(first?.meanKappa).toEqual({ kind: 'value', value: expected, n: 2 })
  })

  test('mean κ falls back like mean pairwise κ', () => {
    // Nine shared items: every pair is too few.
    const [first] = raterOutliers(fromRows(['ababababa', 'ababababa', 'aabbaabba']))
    expect(first?.meanKappa).toEqual({ kind: 'too-few-items', n: 9, minimum: 10 })
  })

  test('with fewer than 3 raters leave-one-out α is N/A and nothing is flagged', () => {
    const pair = raterOutliers(fromRows(['abababababab', 'aabbaabbaabb']))
    expect(pair.map(({ leaveOneOutAlpha, flagged }) => [leaveOneOutAlpha, flagged])).toEqual([
      [null, false],
      [null, false],
    ])
    expect(pair[0]?.meanKappa.kind).toBe('value')
  })

  test('a rater with no ratings does not count towards the 3', () => {
    const outliersWithEmpty = raterOutliers(
      fromRows(['abababababab', '............', 'aabbaabbaabb']),
    )
    expect(outliersWithEmpty.map(({ leaveOneOutAlpha }) => leaveOneOutAlpha)).toEqual([
      null,
      null,
      null,
    ])
    expect(outliersWithEmpty[1]?.meanKappa).toEqual({ kind: 'no-pairable-values' })
  })
})
