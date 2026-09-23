import { describe, expect, test } from 'vitest'
import type { MetricResult } from '../metrics/metric-result'
import { valued } from '../metrics/test-datasets'
import { alphaBand, kappaBand } from './bands'

describe('alphaBand: Krippendorff (2004), edges inclusive from below', () => {
  test.each([
    [1, 'reliable'],
    [0.8, 'reliable'],
    [0.7999999, 'tentative'],
    [0.667, 'tentative'],
    [0.6669999, 'unreliable'],
    [0, 'unreliable'],
    [-0.4, 'unreliable'],
  ])('%f is %s', (value, band) => {
    expect(alphaBand(valued(value))).toBe(band)
  })
})

describe('kappaBand: Landis & Koch (1977), edges inclusive from above', () => {
  test.each([
    [-0.0000001, 'poor'],
    [-1, 'poor'],
    [0, 'slight'],
    [0.2, 'slight'],
    [0.2000001, 'fair'],
    [0.4, 'fair'],
    [0.4000001, 'moderate'],
    [0.6, 'moderate'],
    [0.6000001, 'substantial'],
    [0.8, 'substantial'],
    [0.8000001, 'almost perfect'],
    [1, 'almost perfect'],
  ])('%f is %s', (value, band) => {
    expect(kappaBand(valued(value))).toBe(band)
  })
})

describe('a result without a value has no band', () => {
  const results: MetricResult[] = [
    { kind: 'no-variation', n: 12 },
    { kind: 'too-few-items', n: 7, minimum: 10 },
    { kind: 'no-pairable-values' },
  ]

  test.each(results)('$kind', (result) => {
    expect(alphaBand(result)).toBeNull()
    expect(kappaBand(result)).toBeNull()
  })
})
