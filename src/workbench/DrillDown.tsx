import { useId, useState } from 'react'
import { counted, formatNumber } from '../format/number'
import { card, hint, secondaryButton } from '../ui/classes'
import type { ConfusionWords, DrillDownRow } from './drill-down'

type Props = {
  // Null when the raters never disagree, so nothing is selected.
  confusion: ConfusionWords | null
  rows: readonly DrillDownRow[]
  className: string
}

// How many items show before "Show all".
const FIRST_ROWS = 50

// The items behind the selected confusion, most disputed first, each with its
// text and what every rater said. The workbench keys it by the selection, so
// "Show all" resets when it changes, and announces the change itself.
export function DrillDown({ confusion, rows, className }: Props) {
  const headingId = useId()
  const [showAll, setShowAll] = useState(false)

  if (confusion === null) {
    return (
      <section aria-labelledby={headingId} className={`${card} ${className}`}>
        <h2 id={headingId} className="font-display text-heading font-medium">
          Nothing to drill into
        </h2>
        <p className="max-w-prose text-small text-ink-muted">
          The raters never disagree: every item’s ratings are one category, so there is no
          confusion to list.
        </p>
      </section>
    )
  }

  const shown = showAll ? rows : rows.slice(0, FIRST_ROWS)
  return (
    <section aria-labelledby={headingId} className={`${card} ${className}`}>
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="font-display text-heading font-medium">
          {confusion.name}
        </h2>
        <p className="text-small text-ink-muted">
          {counted(rows.length, 'item')} where one rater said {confusion.first} and another
          said {confusion.second}, most disputed first.
        </p>
      </div>
      <ol className="flex flex-col">
        {shown.map((row) => (
          <Row key={row.item} row={row} />
        ))}
      </ol>
      {shown.length < rows.length && (
        <div>
          <button type="button" className={secondaryButton} onClick={() => setShowAll(true)}>
            Show all {formatNumber(rows.length)} items
          </button>
        </div>
      )}
    </section>
  )
}

function Row({ row }: { row: DrillDownRow }) {
  return (
    <li className="flex flex-col gap-2 border-t border-rule py-3 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-caption text-ink-faint">{row.id}</span>
        {row.text === null ? (
          <span className={hint}>No text in the file.</span>
        ) : (
          <p className="text-small text-ink">{row.text}</p>
        )}
      </div>
      <ul className="flex flex-wrap gap-1" aria-label="Ratings">
        {row.ratings.map(({ rater, category, inConfusion }) => (
          <li
            key={rater}
            className={
              'inline-flex gap-1 rounded-sm px-1.5 text-caption ' +
              (inConfusion ? 'bg-accent-wash text-accent' : 'bg-paper-sunk text-ink-muted')
            }
          >
            <span>{rater}:</span>
            <span className="font-semibold">{category}</span>
          </li>
        ))}
      </ul>
    </li>
  )
}
