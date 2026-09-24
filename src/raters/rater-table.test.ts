import { describe, expect, test } from 'vitest'
import { raterOutliers } from '../analysis/rater-outliers'
import { demo } from '../demo/test-demo'
import { alpha } from '../metrics/alpha'
import { fromRows } from '../metrics/test-datasets'
import type { Dataset } from '../dataset/dataset'
import { raterRows, raterTableSummary, signedDecimal } from './rater-table'

function rows(dataset: Dataset) {
  return raterRows(dataset, raterOutliers(dataset), alpha(dataset))
}

describe('raterRows', () => {
  // r0, r1 and r2 agree throughout; r3 disagrees on every other item.
  const dataset = fromRows([
    'abcabcabcabc',
    'abcabcabcabc',
    'abcabcabcabc',
    'bbcbbcbbcbbc',
  ])
  const table = rows(dataset)

  test('flagged raters come first, then rater order', () => {
    expect(table.map(({ name }) => name)).toEqual(['r3', 'r0', 'r1', 'r2'])
  })

  test('a flagged rater carries the "α would be …" message', () => {
    const [flagged, next] = table
    expect(flagged?.flag).toBe('α would be 1.000 without r3')
    expect(next?.flag).toBeNull()
  })

  test('each row has mean κ with its band, leave-one-out α and the change in α', () => {
    const [flagged, other] = table
    expect(flagged?.meanKappa).toMatchObject({ word: expect.any(String), why: null })
    expect(flagged?.leaveOneOut).toEqual({ value: '1.000', word: '', why: null })
    expect(flagged?.change).toMatch(/^\+0\.\d{3}$/)
    expect(other?.change).toMatch(/^-0\.\d{3}$/)
  })

  test('with fewer than 3 raters leave-one-out α is N/A and says why', () => {
    const [row] = rows(fromRows(['abcabcabcabc', 'abcabcabcabb']))
    expect(row?.leaveOneOut).toEqual({
      value: 'N/A',
      word: 'needs 3 raters',
      why: 'leave-one-out α needs at least 3 raters with ratings',
    })
    expect(row?.change).toBeNull()
    expect(row?.flag).toBeNull()
  })

  test('mean κ without a value says why, for that rater’s pairs', () => {
    const row = rows(fromRows(['abcab', 'abcab', 'abcaa'])).find(({ name }) => name === 'r0')
    expect(row?.meanKappa).toEqual({
      value: 'N/A',
      word: 'too few shared items',
      why: 'no pair with r0 shares 10 items (most: 5)',
    })
  })
})

describe('raterRows: the demo', () => {
  test('the one outlier rater comes first, flagged with its message', () => {
    const [first, ...rest] = rows(demo())
    expect(first?.name).toBe('dana')
    expect(first?.flag).toBe('α would be 0.686 without dana')
    expect(first?.change).toBe('+0.090')
    expect(rest.every(({ flag }) => flag === null)).toBe(true)
  })
})

describe('raterTableSummary', () => {
  test('points at a flagged rater', () => {
    expect(raterTableSummary(rows(demo()))).toMatch(/^Leaving the flagged rater out raises α/)
  })

  test('says nobody is an outlier only when leave-one-out α was computed', () => {
    const three = fromRows(['abcabcabcabc', 'abcabcabcabc', 'abcabcabcabc'])
    expect(raterTableSummary(rows(three))).toMatch(/^No rater is an outlier/)
    const two = fromRows(['abcabcabcabc', 'abcabcabcabb'])
    expect(raterTableSummary(rows(two))).toBe(
      'Leave-one-out α needs at least 3 raters with ratings, so no rater is flagged.',
    )
  })

  test('says why when α has no value', () => {
    const constant = fromRows(['aaaaaaaaaaaa', 'aaaaaaaaaaaa', 'aaaaaaaaaaaa'])
    expect(raterTableSummary(rows(constant))).toBe(
      'α has no value to compare against, so no rater is flagged.',
    )
  })
})

describe('signedDecimal', () => {
  test('3 decimals, with a plus on a rise', () => {
    expect(signedDecimal(0.0712)).toBe('+0.071')
    expect(signedDecimal(-0.0121)).toBe('-0.012')
    expect(signedDecimal(0.0001)).toBe('0.000')
  })
})
