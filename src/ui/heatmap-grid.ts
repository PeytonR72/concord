// What every heatmap shares: the sequential ramp, the cell track, and the
// keyboard moves of a roving-tabindex grid (docs/design/tokens.md, "Data
// visualisation").

// A step of the sequential ramp, seq-100 to seq-800.
export type Step = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800

export const STEPS: readonly Step[] = [100, 200, 300, 400, 500, 600, 700, 800]

// A fraction in [0, 1] mapped linearly onto the ramp's eight steps. Zero and
// anything just above it take the lightest step, so a cell with something to
// show is never blank; 1 is always seq-800.
export function rampStep(fraction: number): Step {
  const index = Math.min(STEPS.length, Math.max(1, Math.ceil(fraction * STEPS.length)))
  return STEPS[index - 1] ?? 100
}

// Each step's fill, with the cell text that clears contrast on it
// (docs/design/tokens.md, "Sequential").
export const stepClasses: Record<Step, string> = {
  100: 'bg-seq-100 text-ink',
  200: 'bg-seq-200 text-ink',
  300: 'bg-seq-300 text-ink',
  400: 'bg-seq-400 text-ink',
  500: 'bg-seq-500 text-ink',
  600: 'bg-seq-600 text-on-accent',
  700: 'bg-seq-700 text-on-accent',
  800: 'bg-seq-800 text-on-accent',
}

// A cell's box: centred, monospaced figures, at least 3rem tall.
export const heatmapCell =
  'flex h-12 min-w-0 items-center justify-center rounded-sm font-mono tabular-nums'

// A cell's column: at least 14 steps of the spacing scale (3.5rem), sharing
// what's left.
export const CELL_TRACK = 'minmax(calc(var(--spacing) * 14), 1fr)'

export type CellPosition = { row: number; column: number }

// Where a key moves focus in a size × size grid: arrows one cell, stopping at
// the edges; Home and End to the row's ends. Null for a key the grid doesn't
// handle.
export function moveFocus(at: CellPosition, key: string, size: number): CellPosition | null {
  const last = size - 1
  const clamp = (value: number) => Math.min(last, Math.max(0, value))
  switch (key) {
    case 'ArrowUp':
      return { ...at, row: clamp(at.row - 1) }
    case 'ArrowDown':
      return { ...at, row: clamp(at.row + 1) }
    case 'ArrowLeft':
      return { ...at, column: clamp(at.column - 1) }
    case 'ArrowRight':
      return { ...at, column: clamp(at.column + 1) }
    case 'Home':
      return { ...at, column: 0 }
    case 'End':
      return { ...at, column: last }
    default:
      return null
  }
}
