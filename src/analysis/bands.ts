import type { MetricResult } from '../metrics/metric-result'

// Bands are conventions, not tests of significance (SPEC.md, "Interpretation
// bands"). Each carries its source so the UI's tooltip can cite it.
export const ALPHA_BAND_SOURCE = 'Krippendorff (2004)'
export const KAPPA_BAND_SOURCE = 'Landis & Koch (1977)'

export type AlphaBand = 'reliable' | 'tentative' | 'unreliable'

export type KappaBand =
  | 'poor'
  | 'slight'
  | 'fair'
  | 'moderate'
  | 'substantial'
  | 'almost perfect'

// α's band: at least 0.800 reliable, at least 0.667 tentative, else
// unreliable. A result without a value has no band; the UI shows its kind.
export function alphaBand(result: MetricResult): AlphaBand | null {
  if (result.kind !== 'value') return null
  if (result.value >= 0.8) return 'reliable'
  if (result.value >= 0.667) return 'tentative'
  return 'unreliable'
}

// κ's band. Landis & Koch write "0.21 to 0.40", leaving gaps between bands,
// so each upper edge is inclusive: 0.20 is slight and anything above it fair.
// A result without a value has no band.
export function kappaBand(result: MetricResult): KappaBand | null {
  if (result.kind !== 'value') return null
  const { value } = result
  if (value < 0) return 'poor'
  if (value <= 0.2) return 'slight'
  if (value <= 0.4) return 'fair'
  if (value <= 0.6) return 'moderate'
  if (value <= 0.8) return 'substantial'
  return 'almost perfect'
}
