// What every metric returns (SPEC.md, "Metrics"). A value carries the n it
// was computed on, so the UI never recomputes it. What n counts is each
// metric's to say: pairable values for α, pairable items for overall percent
// agreement, shared items for pair percent agreement and Cohen's κ, complete
// items for Fleiss' κ, rater pairs for mean pairwise κ.
export type MetricResult =
  | { kind: 'value'; value: number; n: number }
  // A chance-corrected metric whose chance term is zero: every pairable value
  // is one category, so agreement can't be told apart from chance.
  | { kind: 'no-variation'; n: number }
  // Something to compute on, but fewer items than the metric trusts: Cohen's
  // κ below `minimum` shared items, Fleiss' κ below `minimum` complete items.
  | { kind: 'too-few-items'; n: number; minimum: number }
  // Nothing to compute on: no item (or no shared item) has two ratings.
  // Leave-one-out α can reach this even when the full dataset can't.
  | { kind: 'no-pairable-values' }

// The fewest shared (Cohen) or complete (Fleiss) items a κ is reported on.
export const MINIMUM_ITEMS = 10
