import { type KeyboardEvent, type ReactNode, useRef, useState } from 'react'
import { CELL_TRACK, type CellPosition, moveFocus, STEPS, stepClasses } from './heatmap-grid'
import { hint } from './classes'

// What a cell must carry to take part in the grid's roving tabindex.
export type CellFocus = {
  'data-row': number
  'data-column': number
  tabIndex: 0 | -1
  onFocus: () => void
}

type Props = {
  // The accessible name of the group of cells.
  label: string
  // The rows' names, which are also the columns': every heatmap here is square.
  names: readonly string[]
  // The cell that takes the tab stop first.
  start: CellPosition
  renderCell: (position: CellPosition, focus: CellFocus) => ReactNode
}

// Row labels stay in view while wide grids scroll sideways under them.
const rowLabel = 'sticky left-0 z-20 bg-paper-raised'

// A square heatmap's shell: column headings, row labels pinned while the grid
// scrolls sideways inside its card, and cells that are one tab stop, the arrow
// keys moving between them.
export function HeatmapGrid({ label, names, start, renderCell }: Props) {
  const [focus, setFocus] = useState<CellPosition>(start)
  const grid = useRef<HTMLDivElement>(null)
  const size = names.length

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
    <div className="-mx-1 overflow-x-auto px-1 py-1">
      <div
        ref={grid}
        role="group"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="grid gap-0.5 text-caption"
        // Row labels take their width, up to max-w-28, however many columns follow;
        // cells are at least 14 spacing steps (3.5rem) wide.
        style={{ gridTemplateColumns: `max-content repeat(${size}, ${CELL_TRACK})` }}
      >
        <span className={rowLabel} />
        {names.map((name, column) => (
          <span
            key={column}
            data-tooltip={name}
            className="truncate px-0.5 pb-1 text-center text-ink-muted"
          >
            {name}
          </span>
        ))}
        {names.map((name, row) => (
          <Row key={row} name={name}>
            {names.map((_, column) =>
              renderCell(
                { row, column },
                {
                  'data-row': row,
                  'data-column': column,
                  tabIndex: focus.row === row && focus.column === column ? 0 : -1,
                  onFocus: () => setFocus({ row, column }),
                },
              ),
            )}
          </Row>
        ))}
      </div>
    </div>
  )
}

function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <>
      <span
        data-tooltip={name}
        className={`${rowLabel} max-w-28 self-center truncate pr-2 text-right text-ink-muted`}
      >
        {name}
      </span>
      {children}
    </>
  )
}

// The ramp's legend, lightest to darkest, between two words. Hidden from
// screen readers, which get every cell's value from its name.
export function StepLegend({ low, high }: { low: string; high: string }) {
  return (
    <div className={`flex items-center gap-2 ${hint}`} aria-hidden="true">
      <span>{low}</span>
      <span className="flex gap-0.5">
        {STEPS.map((step) => (
          <span key={step} className={`size-3 rounded-sm ${stepClasses[step]}`} />
        ))}
      </span>
      <span>{high}</span>
    </div>
  )
}
