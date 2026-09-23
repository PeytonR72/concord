import { describe, expect, test } from 'vitest'
import { coincidenceMatrix } from './coincidence'
import {
  exampleCDataset,
  exampleCExpected,
  fromRows,
  reorderItems,
  reverseRaters,
} from './test-datasets'

describe('coincidenceMatrix', () => {
  test('weights each ordered pair of an item by 1/(m − 1) and drops single ratings', () => {
    // Item 0: a, a, b. Item 1: a, b. Item 2: c alone, so not pairable.
    const matrix = coincidenceMatrix(fromRows(['aac', 'ab.', 'b..']))

    expect(matrix.counts).toEqual([
      [1, 2, 0],
      [2, 0, 0],
      [0, 0, 0],
    ])
    expect(matrix.marginals).toEqual([3, 2, 0])
    expect(matrix.pairableValues).toBe(5)
  })

  test('is k × k over every category, including ones nobody used', () => {
    const matrix = coincidenceMatrix(fromRows(['ac', 'ac'], { categories: ['a', 'b', 'c', 'd'] }))

    expect(matrix.counts).toEqual([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 2, 0],
      [0, 0, 0, 0],
    ])
    expect(matrix.marginals).toEqual([2, 0, 2, 0])
  })

  test('has no pairable values when no item has two ratings', () => {
    const matrix = coincidenceMatrix(fromRows(['a.b', '.a.', '...']))

    expect(matrix.pairableValues).toBe(0)
    expect(matrix.marginals).toEqual([0, 0])
  })

  test('has no pairable values for a dataset with no items', () => {
    const matrix = coincidenceMatrix(fromRows(['', ''], { categories: ['a', 'b'] }))

    expect(matrix.pairableValues).toBe(0)
    expect(matrix.counts).toEqual([
      [0, 0],
      [0, 0],
    ])
  })

  test('Krippendorff (2011) example C: 40 pairable values and the published marginals', () => {
    const matrix = coincidenceMatrix(exampleCDataset('nominal'))

    expect(matrix.pairableValues).toBe(exampleCExpected.pairableValues)
    expect(matrix.marginals).toEqual([9, 13, 10, 5, 3])
    matrix.counts.forEach((row, c) => {
      row.forEach((count, k) => expect(count).toBeCloseTo(matrix.counts[k]?.[c] ?? NaN, 12))
      expect(row.reduce((sum, count) => sum + count, 0)).toBeCloseTo(matrix.marginals[c] ?? NaN, 12)
    })
  })

  test('refuses a rating outside the categories', () => {
    const dataset = fromRows(['ab', 'ac'], { categories: ['a', 'b'] })

    expect(() => coincidenceMatrix(dataset)).toThrow(RangeError)
  })

  test('does not depend on rater or item order', () => {
    const dataset = fromRows(['abca.', 'bbc.a', 'a.cbb'])
    const expected = coincidenceMatrix(dataset)

    expect(coincidenceMatrix(reverseRaters(dataset))).toEqual(expected)
    const reordered = coincidenceMatrix(reorderItems(dataset, [4, 2, 0, 3, 1]))
    reordered.counts.forEach((row, c) =>
      row.forEach((count, k) => expect(count).toBeCloseTo(expected.counts[c]?.[k] ?? NaN, 12)),
    )
  })
})
