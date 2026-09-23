import type { Level } from '../dataset/dataset'

// Krippendorff's squared difference δ²_ck between categories, as a k × k
// matrix (SPEC.md, "Krippendorff's α"). Ordinal distance depends on the data,
// so it takes the coincidence marginals n_g.
export function distanceMatrix(level: Level, marginals: readonly number[]): number[][] {
  const k = marginals.length
  return Array.from({ length: k }, (_, c) =>
    Array.from({ length: k }, (_, d) => (level === 'nominal' ? nominal(c, d) : ordinal(marginals, c, d))),
  )
}

function nominal(c: number, d: number): number {
  return c === d ? 0 : 1
}

// (Σ_{g=c..d} n_g − (n_c + n_d)/2)², so a category nobody used adds nothing
// between its neighbours.
function ordinal(marginals: readonly number[], c: number, d: number): number {
  const low = Math.min(c, d)
  const high = Math.max(c, d)
  let between = 0
  for (let g = low; g <= high; g++) between += marginals[g] ?? 0
  const difference = between - ((marginals[low] ?? 0) + (marginals[high] ?? 0)) / 2
  return difference * difference
}
