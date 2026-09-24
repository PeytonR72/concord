import { describe, expect, test } from 'vitest'
import { type MetricResult, MINIMUM_ITEMS } from '../metrics/metric-result'
import { meanKappaReading, pairReading, pairsWith } from './result-words'

describe('meanKappaReading: one rater’s pairs', () => {
  const scope = pairsWith('R3')

  test('counts the pairs with that rater', () => {
    const reading = meanKappaReading({ kind: 'value', value: 0.5, n: 1 }, scope)
    expect(reading).toMatchObject({ value: '0.500', note: 'over 1 pair with R3' })
    const many = meanKappaReading({ kind: 'value', value: 0.5, n: 4 }, scope)
    expect(many.note).toBe('over 4 pairs with R3')
  })

  test('says which pairs fell short, and what is missing', () => {
    const short: MetricResult = { kind: 'too-few-items', n: 7, minimum: MINIMUM_ITEMS }
    expect(meanKappaReading(short, scope).note).toBe('no pair with R3 shares 10 items (most: 7)')
    expect(meanKappaReading({ kind: 'no-variation', n: 2 }, scope).note).toBe(
      'every pair with R3 sharing enough items used one category',
    )
    expect(meanKappaReading({ kind: 'no-pairable-values' }, scope).note).toBe(
      'R3 shares no item with another rater',
    )
  })
})

describe('pairReading', () => {
  test('a value prints 3 decimals with its band', () => {
    expect(pairReading({ kind: 'value', value: 0.6123, n: 180 })).toEqual({
      printed: '0.612',
      words: 'substantial',
    })
  })

  test('a result without a value prints N/A and says why', () => {
    expect(pairReading({ kind: 'too-few-items', n: 7, minimum: 10 })).toEqual({
      printed: 'N/A',
      words: 'too few shared items (7 of 10)',
    })
    expect(pairReading({ kind: 'no-variation', n: 12 }).words).toBe(
      'no variation: all 12 shared items are one category',
    )
    expect(pairReading({ kind: 'no-pairable-values' }).words).toBe('no shared items')
  })
})
