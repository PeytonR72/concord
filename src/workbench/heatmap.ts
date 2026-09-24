import { type Confusion, confusionName, type ConfusionShare } from '../analysis/confusion-shares'
import { pairings, percent } from '../format/number'
import type { CoincidenceMatrix } from '../metrics/coincidence'
import { rampStep, type Step } from '../ui/heatmap-grid'

// One cell of the confusion view, row category c against column category k.
export type HeatmapCell = {
  row: number
  column: number
  // The diagonal is agreement and stays neutral; off it, a confusion somebody
  // made, or an empty cell.
  kind: 'diagonal' | 'confusion' | 'empty'
  // What the cell prints: a confusion's disagreement share, the diagonal's
  // pairings, nothing when empty.
  printed: string
  // A confusion's colour; null for the diagonal and empty cells.
  step: Step | null
  // The tooltip, which is also the cell's accessible name.
  label: string
}

// The confusion view's cells (SPEC.md, "Confusion shares"). Off the diagonal
// a cell is coloured and labelled by its confusion's share, which (c, k) and
// (k, c) both show; the diagonal prints its agreement, uncoloured.
export function heatmapCells(
  matrix: CoincidenceMatrix,
  shares: readonly ConfusionShare[],
  categories: readonly string[],
): HeatmapCell[][] {
  const byPair = new Map(shares.map((share) => [`${share.a},${share.b}`, share]))
  const largest = shares.reduce((most, { share }) => Math.max(most, share), 0)
  return matrix.counts.map((counts, row) =>
    counts.map((count, column): HeatmapCell => {
      if (row === column) {
        const printed = pairings(count)
        const name = categories[row] ?? ''
        const label = `${name} ↔ ${name}: ${printed} pairings in agreement`
        return { row, column, kind: 'diagonal', printed, step: null, label }
      }
      // Both cells of a confusion name it the same way, later category first.
      const confusion = { a: Math.min(row, column), b: Math.max(row, column) }
      const pair = confusionName(categories, confusion)
      const share = byPair.get(`${confusion.a},${confusion.b}`)
      if (share === undefined) {
        const label = `${pair}: no pairings`
        return { row, column, kind: 'empty', printed: '', step: null, label }
      }
      const printed = sharePercent(share.share)
      return {
        row,
        column,
        kind: 'confusion',
        printed,
        step: shareStep(share.share, largest),
        label: `${pair}: ${pairings(share.pairings)} pairings (${printed} of all disagreement)`,
      }
    }),
  )
}

// A share above zero maps linearly onto the ramp's eight steps, scaled to the
// largest share in the matrix, so the top confusion is always seq-800 and the
// smallest still gets seq-100.
export function shareStep(share: number, largest: number): Step {
  return rampStep(share / largest)
}

// Whole percents, but a share that rounds to 0% still reads as some.
function sharePercent(share: number): string {
  return share > 0 && share < 0.005 ? '<1%' : percent(share)
}

// The pre-selected confusion: the largest, or none when nobody disagrees.
export function initialSelection(shares: readonly ConfusionShare[]): Confusion | null {
  const [largest] = shares
  return largest === undefined ? null : { a: largest.a, b: largest.b }
}

// The confusion a cell selects: its unordered pair, so (c, k) and (k, c)
// select the same one. The diagonal isn't a confusion, and an empty cell is
// one nobody made, so neither selects anything.
export function cellConfusion({ kind, row, column }: HeatmapCell): Confusion | null {
  if (kind !== 'confusion') return null
  return { a: Math.min(row, column), b: Math.max(row, column) }
}

// Whether a cell shows the selection: both cells of the selected pair do.
export function isSelected(selection: Confusion | null, row: number, column: number): boolean {
  if (selection === null || row === column) return false
  return Math.min(row, column) === selection.a && Math.max(row, column) === selection.b
}

