import { useMemo, useReducer } from 'react'
import type { Dataset } from '../dataset/dataset'
import { counted } from '../format/number'
import { detectShape } from '../ingest/detect-shape'
import { mapDataset } from '../ingest/map-dataset'
import type { Mapping } from '../ingest/mapping'
import type { RawTable } from '../ingest/parse-csv'
import {
  blockedButton,
  eyebrow,
  primaryButton,
  screenFrame,
  secondaryButton,
} from '../ui/classes'
import { editMapping, type MappingEdit } from './edit-mapping'
import { GuardrailPanel } from './GuardrailPanel'
import { MappingForm } from './MappingForm'
import type { MessageContext } from './messages'
import { TablePreview } from './TablePreview'

type Props = {
  fileName: string
  table: RawTable
  onAnalyse: (dataset: Dataset) => void
  onStartOver: () => void
}

// Confirms how a dropped file becomes a Dataset. Detection prefills every
// field; each edit re-maps the whole table, so the guardrails always describe
// what "Analyse" would produce. The reducer reads the table it was created
// with, so the shell keys this screen by file.
export function MappingScreen({ fileName, table, onAnalyse, onStartOver }: Props) {
  const detected = useMemo(() => detectShape(table.headers), [table])
  const [mapping, dispatch] = useReducer(
    (current: Mapping, edit: MappingEdit) => editMapping(table, current, edit),
    detected,
  )
  const { result, warnings } = useMemo(() => mapDataset(table, mapping), [table, mapping])
  const context: MessageContext = { headers: table.headers, shape: mapping.shape }
  const rows = table.rows.length

  return (
    <main className={`${screenFrame} gap-10`}>
      <div className="flex flex-col gap-2">
        <p className={eyebrow}>Your file</p>
        <h1 className="font-display text-title font-medium">Map the columns</h1>
        <p className="max-w-prose break-words text-ink-muted">
          <span className="font-mono text-ink">{fileName}</span> has {counted(rows, 'row')}{' '}
          under {counted(table.headers.length, 'column')}. Concord guessed a {detected.shape}{' '}
          file from its headers: check each choice, then analyse.
        </p>
      </div>

      <div className="grid items-start gap-10 md:grid-cols-12">
        <div className="flex flex-col gap-8 md:col-span-5">
          <MappingForm headers={table.headers} mapping={mapping} dispatch={dispatch} />
          <GuardrailPanel
            blocking={result.ok ? [] : result.error}
            warnings={warnings}
            context={context}
          />
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={`${primaryButton} ${blockedButton}`}
                disabled={!result.ok}
                onClick={() => {
                  if (result.ok) onAnalyse(result.value)
                }}
              >
                Analyse
              </button>
              <button type="button" className={secondaryButton} onClick={onStartOver}>
                Start over
              </button>
            </div>
            <p aria-live="polite" className="text-small text-ink-muted">
              {result.ok ? (
                <>
                  Ready: {counted(result.value.items.length, 'item')},{' '}
                  {counted(result.value.raters.length, 'rater')} and{' '}
                  {counted(result.value.categories.length, 'category', 'categories')},{' '}
                  {result.value.level}.
                </>
              ) : (
                'Fix the problems above to analyse.'
              )}
            </p>
          </div>
        </div>

        <TablePreview
          table={table}
          mapping={mapping}
          className="md:sticky md:top-6 md:col-span-7"
        />
      </div>
    </main>
  )
}
