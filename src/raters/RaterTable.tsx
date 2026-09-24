import { useId } from 'react'
import { card, hint } from '../ui/classes'
import { StatusIcon } from '../ui/StatusIcon'
import { bodyCell, firstCell, headCell, innerCell, lastCell, tableShell } from '../ui/table'
import { type RaterRow, raterTableSummary, type ResultCell } from './rater-table'

type Props = { rows: readonly RaterRow[]; weightingLabel: string; className: string }

// The rater column is wide enough that a flag's message wraps into a few
// lines, not a word a line; the numbers never wrap.
const raterCell = `${bodyCell} ${firstCell} min-w-48 text-left font-normal`
const numberCell = `${bodyCell} whitespace-nowrap`

// Every rater: mean κ against the others, α without them and how far that
// moves α. An outlier rater comes first, washed and flagged with what α would
// be without them.
export function RaterTable({ rows, weightingLabel, className }: Props) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={`${card} ${className}`}>
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="font-display text-heading font-medium">
          Raters
        </h2>
        <p className="text-small text-ink-muted">{raterTableSummary(rows)}</p>
      </div>

      <div className={tableShell}>
        <table className="w-full text-small">
          <thead>
            <tr className="border-b border-rule">
              <th scope="col" className={`${headCell} ${firstCell}`}>
                Rater
              </th>
              <th scope="col" className={`${headCell} ${innerCell}`}>
                Mean κ <span className="font-normal">({weightingLabel})</span>
              </th>
              <th scope="col" className={`${headCell} ${innerCell}`}>
                α without them
              </th>
              <th scope="col" className={`${headCell} ${lastCell}`}>
                Change in α
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row key={row.rater} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Row({ row }: { row: RaterRow }) {
  return (
    <tr
      className={
        'border-b border-rule last:border-b-0 ' + (row.flag === null ? '' : 'bg-warn-wash')
      }
    >
      <th scope="row" className={raterCell}>
        <span className="font-semibold text-ink">{row.name}</span>
        {row.flag !== null && (
          <span className="mt-0.5 flex items-start gap-1 text-small font-semibold text-warn">
            <StatusIcon tone="warn" />
            <span>
              <span className="sr-only">Outlier: </span>
              {row.flag}
            </span>
          </span>
        )}
      </th>
      <Result cell={row.meanKappa} />
      <Result cell={row.leaveOneOut} />
      <td className={`${numberCell} ${lastCell} font-mono tabular-nums`}>
        {row.change ?? <span className="text-ink-faint">N/A</span>}
      </td>
    </tr>
  )
}

// A value and its word; a result without a value says why beneath.
function Result({ cell }: { cell: ResultCell }) {
  return (
    <td className={`${numberCell} ${innerCell}`}>
      <span className="font-mono tabular-nums">{cell.value}</span>
      {cell.word !== '' && <span className="ml-2 text-ink-muted">{cell.word}</span>}
      {cell.why !== null && (
        <span className={`block max-w-48 whitespace-normal ${hint}`}>{cell.why}</span>
      )}
    </td>
  )
}
