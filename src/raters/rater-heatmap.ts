import { counted, decimal } from '../format/number'
import { pairReading } from '../format/result-words'
import type { KappaPair } from '../metrics/cohen'
import { rampStep, type Step } from '../ui/heatmap-grid'

// Above this many raters the heatmap's cells get too small to read, and the
// Raters tab lists the pairs instead (SPEC.md, "Raters tab").
const HEATMAP_RATERS = 30

export function showsHeatmap(raters: number): boolean {
  return raters <= HEATMAP_RATERS
}

// A κ's fill: [0, 1] on the sequential ramp, or the negative fill, which is
// rare enough not to spend a diverging arm on (docs/design/tokens.md).
export type KappaFill = Step | 'negative'

// The fill follows the printed value, so a κ that rounds to 0.000 isn't
// washed as negative under a zero.
export function kappaFill(kappa: number): KappaFill {
  const printed = Number(decimal(kappa))
  return printed < 0 ? 'negative' : rampStep(Math.max(0, kappa))
}

// One cell of the rater heatmap, row rater against column rater.
export type RaterCell = {
  row: number
  column: number
  // A rater against themself, a pair with a κ, or a pair without one.
  kind: 'self' | 'value' | 'absent'
  printed: string
  // A value's colour; null for the diagonal and a pair without a value.
  fill: KappaFill | null
  // The tooltip, which is also the cell's accessible name.
  label: string
}

// The rater × rater heatmap: each pair's Cohen's κ in both of its cells.
export function raterHeatmapCells(
  raters: readonly string[],
  pairs: readonly KappaPair[],
): RaterCell[][] {
  const byPair = new Map(pairs.map((pair) => [`${pair.a},${pair.b}`, pair.result]))
  return raters.map((first, row) =>
    raters.map((second, column): RaterCell => {
      if (row === column) {
        const label = `${first}: the same rater`
        return { row, column, kind: 'self', printed: '', fill: null, label }
      }
      const result = byPair.get(`${Math.min(row, column)},${Math.max(row, column)}`)
      const reading = pairReading(result ?? { kind: 'no-pairable-values' })
      const pair = `${first} × ${second}`
      if (result?.kind !== 'value') {
        const label = `${pair}: ${reading.words}`
        return { row, column, kind: 'absent', printed: reading.printed, fill: null, label }
      }
      const shared = counted(result.n, 'shared item')
      return {
        row,
        column,
        kind: 'value',
        printed: reading.printed,
        fill: kappaFill(result.value),
        label: `${pair}: κ ${reading.printed}, ${reading.words}, ${shared}`,
      }
    }),
  )
}
