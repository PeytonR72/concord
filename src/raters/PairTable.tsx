import { useId, useMemo, useState } from 'react'
import { formatNumber } from '../format/number'
import { card } from '../ui/classes'
import { useShowAll } from '../ui/useShowAll'
import { bodyCell, firstCell, headCell, innerCell, lastCell, tableShell } from '../ui/table'
import {
  DEFAULT_PAIR_SORT,
  type PairRow,
  type PairSort,
  type PairSortKey,
  sortPairRows,
  toggleSort,
} from './pair-table'

type Props = { rows: readonly PairRow[]; weightingLabel: string; className: string }

// Too many raters for a heatmap: every pair as a row, weakest first, sortable
// by raters, κ or shared items.
export function PairTable({ rows, weightingLabel, className }: Props) {
  const headingId = useId()
  const [sort, setSort] = useState<PairSort>(DEFAULT_PAIR_SORT)
  const sorted = useMemo(() => sortPairRows(rows, sort), [rows, sort])
  const { shown, button } = useShowAll(sorted, 'pairs')

  const header = (key: PairSortKey, name: string, padding: string) => (
    <th
      scope="col"
      className={`${headCell} ${padding}`}
      aria-sort={sort.key === key ? sort.direction : undefined}
    >
      <button
        type="button"
        onClick={() => setSort(toggleSort(sort, key))}
        className="-mx-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 hover:text-ink"
      >
        {name}
        <span aria-hidden="true" className="w-3 text-ink">
          {sort.key === key ? (sort.direction === 'ascending' ? '↑' : '↓') : ''}
        </span>
      </button>
    </th>
  )

  return (
    <section aria-labelledby={headingId} className={`${card} ${className}`}>
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="font-display text-heading font-medium">
          Cohen’s κ by rater pair
        </h2>
        <p className="text-small text-ink-muted">
          {formatNumber(rows.length)} pairs, too many for a heatmap, {weightingLabel}. The weakest
          pairs come first; choose a column to sort by it.
        </p>
      </div>

      <div className={tableShell}>
        <table className="w-full text-small">
          <thead>
            <tr className="border-b border-rule">
              {header('raters', 'Raters', firstCell)}
              {header('kappa', 'κ', innerCell)}
              {header('shared', 'Shared items', lastCell)}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={`${row.a},${row.b}`} className="border-b border-rule last:border-b-0">
                <th scope="row" className={`${bodyCell} ${firstCell} text-left font-normal`}>
                  {row.first} × {row.second}
                </th>
                <td className={`${bodyCell} ${innerCell}`}>
                  <span className="font-mono tabular-nums">{row.printed}</span>
                  <span className="ml-2 text-ink-muted">{row.words}</span>
                </td>
                <td className={`${bodyCell} ${lastCell} font-mono tabular-nums`}>
                  {formatNumber(row.shared)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {button}
    </section>
  )
}
