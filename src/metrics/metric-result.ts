// What every metric returns (SPEC.md, "Metrics"). A value carries the n it
// was computed on, so the UI never recomputes it. What n counts is each
// metric's to say: pairable values for α, pairable items for overall percent
// agreement, shared items for pair percent agreement.
export type MetricResult =
  | { kind: 'value'; value: number; n: number }
  // A chance-corrected metric whose chance term is zero: every pairable value
  // is one category, so agreement can't be told apart from chance.
  | { kind: 'no-variation'; n: number }
  // Nothing to compute on: no item (or no shared item) has two ratings.
  // Leave-one-out α can reach this even when the full dataset can't.
  | { kind: 'no-pairable-values' }
