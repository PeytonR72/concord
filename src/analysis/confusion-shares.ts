import type { CoincidenceMatrix } from '../metrics/coincidence'

// A confusion: two distinct categories, by index, with a < b. It is also the
// drill-down's selection, so it stays a plain, serialisable value.
export type Confusion = { a: number; b: number }

export type ConfusionShare = Confusion & {
  // o_ab + o_ba: the confusion's pairable values in the coincidence matrix.
  pairings: number
  // Its disagreement share: pairings over all off-diagonal mass.
  share: number
}

// Every confusion someone made, with its disagreement share (SPEC.md,
// "Confusion shares"), largest first; ties go to the lower category indices,
// so the first is the confusion the confusion view pre-selects. With no
// disagreement there is nothing to share out, so the list is empty.
export function confusionShares(matrix: CoincidenceMatrix): ConfusionShare[] {
  const { counts } = matrix
  const confusions: Omit<ConfusionShare, 'share'>[] = []
  let offDiagonal = 0
  counts.forEach((row, a) => {
    for (let b = a + 1; b < row.length; b++) {
      const pairings = (row[b] ?? 0) + (counts[b]?.[a] ?? 0)
      offDiagonal += pairings
      if (pairings > 0) confusions.push({ a, b, pairings })
    }
  })

  // Pushed in (a, b) order, and the sort is stable, so ties keep it. Pairings
  // are sums of 1/(m − 1) weights, so equal ones can differ in the last bits:
  // they are compared rounded to TIE, which keeps the comparison transitive.
  return confusions
    .map((confusion) => ({ ...confusion, share: confusion.pairings / offDiagonal }))
    .sort((x, y) => rounded(y.pairings) - rounded(x.pairings))
}

// The precision pairings are compared at.
const TIE = 1e-9

function rounded(pairings: number): number {
  return Math.round(pairings / TIE)
}
