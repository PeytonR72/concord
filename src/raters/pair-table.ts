import { pairReading } from '../format/result-words'
import type { KappaPair } from '../metrics/cohen'

// One rater pair in the list that replaces the heatmap above 30 raters.
export type PairRow = {
  a: number
  b: number
  first: string
  second: string
  // The value to sort by; null for a pair without one.
  kappa: number | null
  printed: string
  words: string
  shared: number
}

export type PairSortKey = 'raters' | 'kappa' | 'shared'
export type PairSort = { key: PairSortKey; direction: 'ascending' | 'descending' }

// The weakest pairs first: in a list this long, they are what needs reading.
export const DEFAULT_PAIR_SORT: PairSort = { key: 'kappa', direction: 'ascending' }

// Where a column starts when first chosen: raters in rater order, the most
// shared items first, the lowest κ first.
const NATURAL: Record<PairSortKey, PairSort['direction']> = {
  raters: 'ascending',
  kappa: 'ascending',
  shared: 'descending',
}

export function pairRows(raters: readonly string[], pairs: readonly KappaPair[]): PairRow[] {
  return pairs.map(({ a, b, result }) => ({
    a,
    b,
    first: raters[a] ?? '',
    second: raters[b] ?? '',
    kappa: result.kind === 'value' ? result.value : null,
    ...pairReading(result),
    shared: result.kind === 'no-pairable-values' ? 0 : result.n,
  }))
}

// The rows in the given order, ties in rater order. Pairs without a κ go last
// whichever way κ sorts, since they have nothing to compare.
export function sortPairRows(rows: readonly PairRow[], { key, direction }: PairSort): PairRow[] {
  const sign = direction === 'ascending' ? 1 : -1
  const byRaters = (x: PairRow, y: PairRow) => x.a - y.a || x.b - y.b
  return [...rows].sort((x, y) => {
    switch (key) {
      case 'raters':
        return sign * byRaters(x, y)
      case 'shared':
        return sign * (x.shared - y.shared) || byRaters(x, y)
      case 'kappa':
        if (x.kappa === null || y.kappa === null) {
          return (x.kappa === null ? 1 : 0) - (y.kappa === null ? 1 : 0) || byRaters(x, y)
        }
        return sign * (x.kappa - y.kappa) || byRaters(x, y)
    }
  })
}

// Choosing a column: the sorted column flips, another starts in its natural
// direction.
export function toggleSort(current: PairSort, key: PairSortKey): PairSort {
  if (current.key !== key) return { key, direction: NATURAL[key] }
  return { key, direction: current.direction === 'ascending' ? 'descending' : 'ascending' }
}
