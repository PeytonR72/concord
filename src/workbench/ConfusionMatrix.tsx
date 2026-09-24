import { type KeyboardEvent, useId, useRef, useState } from 'react'
import type { Confusion } from '../analysis/confusion-shares'
import { card, hint } from '../ui/classes'
import {
  type CellPosition,
  cellConfusion,
  type HeatmapCell,
  isSelected,
  moveFocus,
  type Step,
} from './heatmap'

type Props = {
  cells: readonly (readonly HeatmapCell[])[]
  categories: readonly string[]
  selection: Confusion | null
  onSelect: (confusion: Confusion) => void
  className: string
}

// Each step's fill, with the cell text that clears contrast on it
// (docs/design/tokens.md, "Sequential").
const stepClasses: Record<Step, string> = {
  100: 'bg-seq-100 text-ink',
  200: 'bg-seq-200 text-ink',
  300: 'bg-seq-300 text-ink',
  400: 'bg-seq-400 text-ink',
  500: 'bg-seq-500 text-ink',
  600: 'bg-seq-600 text-on-accent',
  700: 'bg-seq-700 text-on-accent',
  800: 'bg-seq-800 text-on-accent',
}

// The selected confusion's two cells: an ink ring outside the cell with a
// paper gap, lifted over its neighbours. An ink line inside the cell would
// vanish on seq-800, which is where the largest confusion always sits.
const selectedCell = 'relative z-10 ring-2 ring-ink ring-offset-2 ring-offset-paper-raised'

// Row labels stay in view while wide matrices scroll sideways under them.
const rowLabel = 'sticky left-0 z-20 bg-paper-raised'

// A cell's column: at least 14 steps of the spacing scale (3.5rem), sharing
// what's left.
const CELL_TRACK = 'minmax(calc(var(--spacing) * 14), 1fr)'

const LEGEND: readonly Step[] = [100, 200, 300, 400, 500, 600, 700, 800]

// The confusion view: the coincidence matrix as a heatmap. Off the diagonal a
// cell's colour is its confusion's share of all disagreement; clicking one
// selects that confusion for the drill-down. The cells are one tab stop, and
// the arrow keys move between them.
export function ConfusionMatrix({ cells, categories, selection, onSelect, className }: Props) {
  const headingId = useId()
  const [focus, setFocus] = useState<CellPosition>(() => startingFocus(selection))
  const grid = useRef<HTMLDivElement>(null)
  const size = categories.length

  function select(cell: HeatmapCell) {
    const confusion = cellConfusion(cell)
    if (confusion !== null) onSelect(confusion)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = moveFocus(focus, event.key, size)
    if (next === null) return
    event.preventDefault()
    setFocus(next)
    grid.current
      ?.querySelector<HTMLElement>(`[data-row="${next.row}"][data-column="${next.column}"]`)
      ?.focus()
  }

  return (
    <section
      aria-labelledby={headingId}
      className={`${card} ${className}`}
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="font-display text-heading font-medium">
          Confusion matrix
        </h2>
        <p className="text-small text-ink-muted">
          Every pair of ratings on an item, by the two categories. Select a cell to list the
          items behind it.
        </p>
      </div>

      {/* Scrolls inside the card when the categories outgrow it. */}
      <div className="-mx-1 overflow-x-auto px-1 py-1">
        <div
          ref={grid}
          role="group"
          aria-label="Confusion matrix cells"
          onKeyDown={onKeyDown}
          className="grid gap-0.5 text-caption"
          // Row labels take their width, up to max-w-28, however many columns follow;
          // cells are at least 14 spacing steps (3.5rem) wide.
          style={{ gridTemplateColumns: `max-content repeat(${size}, ${CELL_TRACK})` }}
        >
          <span className={rowLabel} />
          {categories.map((category) => (
            <span
              key={category}
              data-tooltip={category}
              className="truncate px-0.5 pb-1 text-center text-ink-muted"
            >
              {category}
            </span>
          ))}
          {cells.map((row, r) => (
            <Row
              key={r}
              category={categories[r] ?? ''}
              cells={row}
              selection={selection}
              focus={focus}
              onFocus={setFocus}
              onSelect={select}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className={`flex items-center gap-2 ${hint}`} aria-hidden="true">
          <span>Less</span>
          <span className="flex gap-0.5">
            {LEGEND.map((step) => (
              <span key={step} className={`size-3 rounded-sm ${stepClasses[step]}`} />
            ))}
          </span>
          <span>more of the disagreement</span>
        </div>
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

function Row(props: {
  category: string
  cells: readonly HeatmapCell[]
  selection: Confusion | null
  focus: CellPosition
  onFocus: (position: CellPosition) => void
  onSelect: (cell: HeatmapCell) => void
}) {
  return (
    <>
      <span
        data-tooltip={props.category}
        className={`${rowLabel} max-w-28 self-center truncate pr-2 text-right text-ink-muted`}
      >
        {props.category}
      </span>
      {props.cells.map((cell) => {
        const { row, column } = cell
        const selected = isSelected(props.selection, row, column)
        const focused = props.focus.row === row && props.focus.column === column
        return (
          <button
            key={column}
            type="button"
            data-row={row}
            data-column={column}
            data-tooltip={cell.label}
            aria-label={cell.label}
            aria-pressed={cell.kind === 'confusion' ? selected : undefined}
            aria-disabled={cell.kind === 'confusion' ? undefined : true}
            tabIndex={focused ? 0 : -1}
            onFocus={() => props.onFocus({ row, column })}
            onClick={() => props.onSelect(cell)}
            className={
              'flex h-12 min-w-0 items-center justify-center rounded-sm font-mono tabular-nums ' +
              `${cellClasses(cell)} ${selected ? selectedCell : ''}`
            }
          >
            <span aria-hidden="true">{cell.printed}</span>
          </button>
        )
      })}
    </>
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
