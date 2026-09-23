import type { Dataset } from '../dataset/dataset'
import { coincidenceMatrix } from './coincidence'
import { distanceMatrix } from './distance'
import type { MetricResult } from './metric-result'

// Krippendorff's α at the dataset's level: 1 − D_o/D_e, computed from the
// coincidence matrix as 1 − (n − 1)·Σ o_ck δ²_ck / Σ n_c n_k δ²_ck. n is the
// number of pairable values; items with fewer than two ratings drop out.
export function alpha(dataset: Dataset): MetricResult {
  const { counts, marginals, pairableValues: n } = coincidenceMatrix(dataset)
  if (n === 0) return { kind: 'no-pairable-values' }

  const delta = distanceMatrix(dataset.level, marginals)
  let observed = 0
  let expected = 0
  counts.forEach((row, c) => {
    row.forEach((count, d) => {
      const distance = delta[c]?.[d] ?? 0
      observed += count * distance
      expected += (marginals[c] ?? 0) * (marginals[d] ?? 0) * distance
    })
  })

  // Only one category among the pairable values: D_e is 0 and α is 0/0.
  if (expected === 0) return { kind: 'no-variation', n }
  return { kind: 'value', value: 1 - ((n - 1) * observed) / expected, n }
}
