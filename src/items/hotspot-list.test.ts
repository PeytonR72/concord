import { describe, expect, test } from 'vitest'
import { hotspots } from '../analysis/hotspots'
import { demo } from '../demo/test-demo'
import { fromRows } from '../metrics/test-datasets'
import type { Dataset } from '../dataset/dataset'
import { agreementNote, hotspotRows } from './hotspot-list'

function rows(dataset: Dataset) {
  return hotspotRows(dataset, hotspots(dataset))
}

describe('hotspotRows', () => {
  // i0: a, a, b (1 − P = 2/3); i1: all a; i2: a, c, c.
  const dataset = fromRows(['aaa', 'aac', 'bac'], { categories: ['A', 'B', 'C'] })

  test('ranks from 1 in hotspot order, with id, text and the item index', () => {
    const table = rows(dataset)
    expect(table.map(({ rank, id }) => `${rank} ${id}`)).toEqual(['1 i0', '2 i2', '3 i1'])
    expect(table[0]).toMatchObject({ item: 0, text: null })
  })

  test('nominal disagreement is the share of rating pairs that disagree', () => {
    const [first, , last] = rows(dataset)
    expect(first?.disagreement).toBe('67%')
    expect(first?.disagreementLabel).toBe('67% of rating pairs disagree')
    expect(last?.disagreement).toBe('0%')
  })

  test('ordinal disagreement is the mean distance between ratings, in categories', () => {
    const ordinal = fromRows(['aaa', 'aac', 'bac'], { level: 'ordinal' })
    const [first] = rows(ordinal)
    expect(first?.id).toBe('i2')
    expect(first?.disagreement).toBe('1.33')
    expect(first?.disagreementLabel).toBe('ratings 1.33 categories apart on average')
  })

  test('carries the bar’s segments and a summary of them for screen readers', () => {
    const [first] = rows(dataset)
    expect(first?.segments.map(({ slot, count }) => [slot, count])).toEqual([
      [1, 2],
      [2, 1],
    ])
    expect(first?.barLabel).toBe('A: 2 of 3 ratings; B: 1 of 3 ratings')
  })
})

describe('hotspotRows: the demo', () => {
  // The tokens.md slots: Negative is category 3, Sarcastic 4.
  const top = rows(demo()).slice(0, 5)
  const slots = (row: (typeof top)[number] | undefined) => row?.segments.map(({ slot }) => slot)

  test('the top item is split between Negative and Sarcastic alone', () => {
    expect(top[0]?.id).toBe('m113')
    expect(slots(top[0])).toEqual([3, 4])
  })

  test('every one of the top rows has raters split between Negative and Sarcastic', () => {
    for (const row of top) {
      expect(slots(row)).toContain(3)
      expect(slots(row)).toContain(4)
    }
  })
})

describe('agreementNote', () => {
  test('says so when every pairable item’s ratings are one category', () => {
    const agreed = fromRows(['aab', 'aab', 'aab'], { categories: ['A', 'B'] })
    expect(agreementNote(agreed, hotspots(agreed))).toBe(
      'The raters never disagree: every item’s ratings are one category, so every item ties ' +
        'at 0%.',
    )
  })

  test('prints the tie as a distance on ordinal data', () => {
    const agreed = fromRows(['aab', 'aab'], { level: 'ordinal' })
    expect(agreementNote(agreed, hotspots(agreed))).toMatch(/ties at 0\.00\.$/)
  })

  test('is null when any item has a disagreement', () => {
    const split = fromRows(['aab', 'aab', 'abb'], { categories: ['A', 'B'] })
    expect(agreementNote(split, hotspots(split))).toBeNull()
    expect(agreementNote(demo(), hotspots(demo()))).toBeNull()
  })
})
