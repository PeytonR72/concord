import type { RawTable } from '../ingest/parse-csv'
import { screenFrame, secondaryButton } from '../ui/classes'

type Props = { fileName: string; table: RawTable; onStartOver: () => void }

// Stands in for the mapping screen until stage 9 builds it: proof the file
// parsed, with its headers and row count.
export function MappingPlaceholder({ fileName, table, onStartOver }: Props) {
  const rows = table.rows.length

  return (
    <main className={`${screenFrame} gap-8`}>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-title font-medium break-words">
          Read <span className="font-mono text-heading">{fileName}</span>
        </h1>
        <p className="max-w-prose text-ink-muted">
          <span className="font-mono tabular-nums">{rows}</span> {rows === 1 ? 'row' : 'rows'}{' '}
          under {table.headers.length} {table.headers.length === 1 ? 'column' : 'columns'}. The
          mapping screen, where you confirm which column is which, is still being built.
        </p>
      </div>
      <ul aria-label="Columns" className="flex flex-wrap gap-2">
        {table.headers.map((header, index) => (
          <li
            key={index}
            className={
              'max-w-full truncate rounded-sm border border-rule bg-paper-raised px-2 py-1 ' +
              'font-mono text-small'
            }
          >
            {header === '' ? <span className="text-ink-faint">Column {index + 1}</span> : header}
          </li>
        ))}
      </ul>
      <div>
        <button type="button" className={secondaryButton} onClick={onStartOver}>
          Start over
        </button>
      </div>
    </main>
  )
}
