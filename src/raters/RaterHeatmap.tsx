import { useId } from 'react'
import { MINIMUM_ITEMS } from '../metrics/metric-result'
import { card, hint } from '../ui/classes'
import { heatmapCell, stepClasses } from '../ui/heatmap-grid'
import { HeatmapGrid, StepLegend } from '../ui/HeatmapGrid'
import type { KappaFill, RaterCell } from './rater-heatmap'

type Props = {
  cells: readonly (readonly RaterCell[])[]
  raters: readonly string[]
  weightingLabel: string
  className: string
}

// A κ's fill: the ramp's steps, or the negative wash with ink text.
const fillClasses: Record<KappaFill, string> = {
  ...stepClasses,
  negative: 'bg-viz-negative text-ink',
}

// Rater against rater, each pair's Cohen's κ in both of its cells. κ from 0
// to 1 is on the ramp; a negative κ is its own wash, its value always printed.
// The cells are one tab stop, and the arrow keys move between them.
export function RaterHeatmap({ cells, raters, weightingLabel, className }: Props) {
  const headingId = useId()
  const negative = cells.some((row) => row.some(({ fill }) => fill === 'negative'))
  return (
    <section aria-labelledby={headingId} className={`${card} ${className}`}>
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="font-display text-heading font-medium">
          Cohen’s κ by rater pair
        </h2>
        <p className="text-small text-ink-muted">
          How far each pair of raters agrees beyond chance, {weightingLabel}, on the items both
          labelled.
        </p>
      </div>

      <HeatmapGrid
        label="Cohen’s κ cells"
        names={raters}
        start={{ row: 0, column: raters.length > 1 ? 1 : 0 }}
        renderCell={({ row, column }, focus) => {
          const cell = cells[row]?.[column]
          if (cell === undefined) return null
          return (
            <span
              key={column}
              role="img"
              {...focus}
              data-tooltip={cell.label}
              aria-label={cell.label}
              className={`${heatmapCell} ${cellClasses(cell)}`}
            >
              <span aria-hidden="true">{cell.printed}</span>
            </span>
          )
        }}
      />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <StepLegend low="κ 0" high="1" />
          {negative && (
            <div className={`flex items-center gap-2 ${hint}`} aria-hidden="true">
              <span className={`size-3 rounded-sm ${fillClasses.negative}`} />
              <span>below 0</span>
            </div>
          )}
        </div>
        <p className={hint}>
          N/A marks a pair that shares fewer than {MINIMUM_ITEMS} items, or whose shared ratings
          are all one category. The diagonal is each rater against themself.
        </p>
      </div>
    </section>
  )
}

function cellClasses(cell: RaterCell): string {
  if (cell.kind === 'self') return 'bg-viz-diagonal'
  if (cell.fill === null) return 'border border-rule bg-paper-raised text-ink-faint'
  return fillClasses[cell.fill]
}
