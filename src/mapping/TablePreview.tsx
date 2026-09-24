import { useId } from 'react'
import { counted } from '../format/number'
import type { Mapping } from '../ingest/mapping'
import type { RawTable } from '../ingest/parse-csv'
import { eyebrow, hint } from '../ui/classes'
import { columnRoles } from './edit-mapping'
import { columnLabel } from './messages'

type Props = { table: RawTable; mapping: Mapping; className: string }

const PREVIEW_ROWS = 8

// The file's first rows as read, each column tagged with the role the mapping
// gives it, and each row with the file line guardrail messages cite.
export function TablePreview({ table, mapping, className }: Props) {
  const headingId = useId()
  const rows = table.rows.slice(0, PREVIEW_ROWS)
  const roles = table.headers.map((_, column) => columnRoles(mapping, column))

  return (
    <section aria-labelledby={headingId} className={`flex min-w-0 flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className={eyebrow}>
          Preview
        </h2>
        <p className={hint}>
          {rows.length < table.rows.length
            ? `First ${rows.length} of ${counted(table.rows.length, 'row')}`
            : counted(table.rows.length, 'row')}
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-rule bg-paper-raised shadow-card">
        <table className="w-full border-collapse text-left text-small">
          <thead>
            <tr className="border-b border-rule">
              <th scope="col" className="px-3 py-2 align-bottom font-normal text-ink-faint">
                <span className="text-caption">Line</span>
              </th>
              {table.headers.map((_, column) => (
                <th key={column} scope="col" className="px-3 py-2 align-bottom">
                  <div className="flex flex-col gap-1">
                    <RoleTags roles={roles[column] ?? []} />
                    <span className="max-w-48 truncate font-mono font-semibold">
                      {columnLabel(table.headers, column)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-rule last:border-b-0">
                <td className="px-3 py-1.5 font-mono text-caption text-ink-faint tabular-nums">
                  {table.lineNumbers[index]}
                </td>
                {table.headers.map((_, column) => (
                  <td
                    key={column}
                    className={
                      'max-w-48 truncate px-3 py-1.5 font-mono ' +
                      ((roles[column] ?? []).length > 0 ? 'text-ink' : 'text-ink-faint')
                    }
                  >
                    {row[column]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function RoleTags({ roles }: { roles: readonly string[] }) {
  if (roles.length === 0) {
    return <span className="text-caption font-normal text-ink-faint">not used</span>
  }
  return (
    <span className="flex gap-1">
      {roles.map((role) => (
        <span
          key={role}
          className="rounded-sm bg-accent-wash px-1.5 text-caption font-semibold text-accent"
        >
          {role}
        </span>
      ))}
    </span>
  )
}
