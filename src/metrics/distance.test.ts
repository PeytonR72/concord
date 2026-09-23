import { describe, expect, test } from 'vitest'
import { distanceMatrix } from './distance'

describe('distanceMatrix', () => {
  test('nominal: 0 on the diagonal, 1 everywhere else', () => {
    expect(distanceMatrix('nominal', [5, 0, 2])).toEqual([
      [0, 1, 1],
      [1, 0, 1],
      [1, 1, 0],
    ])
  })

  test('ordinal: squared rank distance from the coincidence marginals', () => {
    // Krippendorff (2011) example C marginals: n = 9, 13, 10, 5, 3.
    const delta = distanceMatrix('ordinal', [9, 13, 10, 5, 3])

    // (Σ_{g=1..2} n_g − (n_1 + n_2)/2)² = (22 − 11)² = 121
    expect(delta[0]?.[1]).toBe(121)
    // (9 + 13 + 10 − (9 + 10)/2)² = 22.5²
    expect(delta[0]?.[2]).toBe(506.25)
    // (40 − (9 + 3)/2)² = 34²
    expect(delta[0]?.[4]).toBe(1156)
    delta.forEach((row, c) => {
      expect(row[c]).toBe(0)
      row.forEach((value, k) => expect(value).toBe(delta[k]?.[c]))
    })
  })

  test('ordinal: a category with a zero marginal adds nothing between its neighbours', () => {
    const withGap = distanceMatrix('ordinal', [4, 0, 6])
    const withoutGap = distanceMatrix('ordinal', [4, 6])

    expect(withGap[0]?.[2]).toBe(withoutGap[0]?.[1])
    expect(withGap[0]?.[1]).toBe(4)
    expect(withGap[1]?.[2]).toBe(9)
  })
})
