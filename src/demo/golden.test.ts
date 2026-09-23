import { describe, expect, it } from 'vitest'
import { raterOutliers } from '../analysis/rater-outliers'
import type { Dataset } from '../dataset/dataset'
import { alpha } from '../metrics/alpha'
import { cohenKappa, meanPairwiseKappa } from '../metrics/cohen'
import { fleissKappa } from '../metrics/fleiss'
import type { MetricResult } from '../metrics/metric-result'
import { percentAgreement } from '../metrics/percent-agreement'
import golden from './golden.json'
import { demo } from './test-demo'

// The demo cross-check (SPEC.md): scripts/golden.py computes the demo's
// metrics with sklearn, statsmodels and krippendorff; Concord must match.
const TOLERANCE = 1e-6

function expectGolden(actual: MetricResult | null, expected: { value: number; n: number }) {
  expect(actual?.kind).toBe('value')
  if (actual?.kind !== 'value') return
  expect(Math.abs(actual.value - expected.value)).toBeLessThanOrEqual(TOLERANCE)
  expect(actual.n).toBe(expected.n)
}

function rater(dataset: Dataset, name: string): number {
  const index = dataset.raters.indexOf(name)
  expect(index).not.toBe(-1)
  return index
}

describe('the demo against golden.json', () => {
  const dataset = demo()

  it('matches Krippendorff’s α', () => expectGolden(alpha(dataset), golden.alpha))

  it('matches Fleiss’ κ', () => expectGolden(fleissKappa(dataset), golden.fleissKappa))

  it('matches mean pairwise κ', () => {
    expectGolden(meanPairwiseKappa(dataset), golden.meanPairwiseKappa)
  })

  it('matches overall percent agreement', () => {
    expectGolden(percentAgreement(dataset), golden.percentAgreement)
  })

  it('matches Cohen’s κ for every pair', () => {
    expect(golden.pairwiseKappa).toHaveLength(10)
    for (const pair of golden.pairwiseKappa) {
      const a = rater(dataset, pair.a)
      const b = rater(dataset, pair.b)
      expectGolden(cohenKappa(dataset, a, b, 'unweighted'), pair)
    }
  })

  it('matches each rater’s leave-one-out α', () => {
    const outliers = raterOutliers(dataset)
    expect(golden.leaveOneOutAlpha).toHaveLength(dataset.raters.length)
    for (const expected of golden.leaveOneOutAlpha) {
      const outlier = outliers[rater(dataset, expected.rater)]
      expectGolden(outlier?.leaveOneOutAlpha ?? null, expected)
    }
  })
})
