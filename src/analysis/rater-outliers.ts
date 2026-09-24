import type { Dataset } from '../dataset/dataset'
import { decimal } from '../format/number'
import { alpha } from '../metrics/alpha'
import { defaultWeighting, meanKappa, pairwiseKappa, type Weighting } from '../metrics/cohen'
import type { MetricResult } from '../metrics/metric-result'

// How far leave-one-out α must rise above α to flag the rater left out.
export const OUTLIER_THRESHOLD = 0.05

// Differences this close to the threshold count as reaching it: 0.7 − 0.65
// is 0.04999999999999993 in floating point.
const EPSILON = 1e-9

export type RaterOutlier = {
  // The rater's index in `dataset.raters`.
  rater: number
  // Mean Cohen's κ over the pairs this rater is in, with mean pairwise κ's n
  // and fallbacks.
  meanKappa: MetricResult
  // α without this rater; null (N/A) with fewer than 3 raters.
  leaveOneOutAlpha: MetricResult | null
  flagged: boolean
}

// Per rater, mean κ against the others and leave-one-out α (SPEC.md, "Rater
// outliers"), in rater order. A rater with no ratings doesn't count towards
// the 3 raters leave-one-out α needs, as the guardrails don't count them.
export function raterOutliers(
  dataset: Dataset,
  weighting: Weighting = defaultWeighting(dataset.level),
): RaterOutlier[] {
  const pairs = pairwiseKappa(dataset, weighting)
  const full = alpha(dataset)
  const ratingRaters = dataset.ratings.filter((row) => row.some((category) => category !== null))

  return dataset.raters.map((_, rater) => {
    const leaveOneOutAlpha = ratingRaters.length < 3 ? null : alpha(without(dataset, rater))
    return {
      rater,
      meanKappa: meanKappa(pairs.filter(({ a, b }) => a === rater || b === rater)),
      leaveOneOutAlpha,
      flagged: flagsOutlier(full, leaveOneOutAlpha),
    }
  })
}

// Whether leaving a rater out raises α by at least OUTLIER_THRESHOLD. Only a
// value against a value can: anything else is never flagged.
export function flagsOutlier(full: MetricResult, leaveOneOut: MetricResult | null): boolean {
  if (full.kind !== 'value' || leaveOneOut?.kind !== 'value') return false
  return leaveOneOut.value - full.value >= OUTLIER_THRESHOLD - EPSILON
}

// A flagged rater's message (SPEC.md, "Rater outliers"): "α would be 0.710
// without R3", shared by the Raters tab and the summary Markdown.
export function outlierMessage(rater: string, leaveOneOutAlpha: number): string {
  return `α would be ${decimal(leaveOneOutAlpha)} without ${rater}`
}

function without(dataset: Dataset, rater: number): Dataset {
  return {
    ...dataset,
    raters: dataset.raters.filter((_, index) => index !== rater),
    ratings: dataset.ratings.filter((_, index) => index !== rater),
  }
}
