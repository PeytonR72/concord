import { useId } from 'react'
import type { Confusion } from '../analysis/confusion-shares'
import { card, hint } from '../ui/classes'
import { type CellPosition, heatmapCell, stepClasses } from '../ui/heatmap-grid'
import { HeatmapGrid, StepLegend } from '../ui/HeatmapGrid'
import { cellConfusion, type HeatmapCell, isSelected } from './heatmap'

type Props = {
  cells: readonly (readonly HeatmapCell[])[]
  categories: readonly string[]
  selection: Confusion | null
  onSelect: (confusion: Confusion) => void
  className: string
}

// The selected confusion's two cells: an ink ring outside the cell with a
// paper gap, lifted over its neighbours. An ink line inside the cell would
// vanish on seq-800, which is where the largest confusion always sits.
const selectedCell = 'relative z-10 ring-2 ring-ink ring-offset-2 ring-offset-paper-raised'

// The confusion view: the coincidence matrix as a heatmap. Off the diagonal a
// cell's colour is its confusion's share of all disagreement; clicking one
// selects that confusion for the drill-down. The cells are one tab stop, and
// the arrow keys move between them.
export function ConfusionMatrix({ cells, categories, selection, onSelect, className }: Props) {
  const headingId = useId()

  function select(cell: HeatmapCell) {
    const confusion = cellConfusion(cell)
    if (confusion !== null) onSelect(confusion)
  }

  return (
    <section aria-labelledby={headingId} className={`${card} ${className}`}>
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="font-display text-heading font-medium">
          Confusion matrix
        </h2>
        <p className="text-small text-ink-muted">
          Every pair of ratings on an item, by the two categories. Select a cell to list the
          items behind it.
        </p>
      </div>

      <HeatmapGrid
        label="Confusion matrix cells"
        names={categories}
        start={startingFocus(selection)}
        renderCell={({ row, column }, focus) => {
          const cell = cells[row]?.[column]
          if (cell === undefined) return null
          const selected = isSelected(selection, row, column)
          return (
            <button
              key={column}
              type="button"
              {...focus}
              data-tooltip={cell.label}
              aria-label={cell.label}
              aria-pressed={cell.kind === 'confusion' ? selected : undefined}
              aria-disabled={cell.kind === 'confusion' ? undefined : true}
              onClick={() => select(cell)}
              className={`${heatmapCell} ${cellClasses(cell)} ${selected ? selectedCell : ''}`}
            >
              <span aria-hidden="true">{cell.printed}</span>
            </button>
          )
        }}
      />

      <div className="flex flex-col gap-2">
        <StepLegend low="Less" high="more of the disagreement" />
        <p className={hint}>
          {selection === null
            ? 'The raters never disagree, so no cell off the diagonal is coloured.'
            : 'Cells off the diagonal show each confusion’s share of all disagreement, in both ' +
              'of its cells. The diagonal is agreement, in pairings, and stays uncoloured.'}
        </p>
      </div>
    </section>
  )
}

// Each alternative carries its own background, so no two compete. Only a
// confusion selects, so only it takes the pointer.
function cellClasses(cell: HeatmapCell): string {
  if (cell.kind === 'diagonal') return 'cursor-default bg-viz-diagonal text-ink'
  if (cell.step === null) return 'cursor-default border border-rule bg-paper-raised text-ink'
  return `cursor-pointer ${stepClasses[cell.step]}`
}

// Focus starts on the pre-selected confusion's lower-triangle cell, where it
// reads row ↔ column as the drill-down names it, or on the top-left cell.
function startingFocus(selection: Confusion | null): CellPosition {
  return selection === null ? { row: 0, column: 0 } : { row: selection.b, column: selection.a }
}
