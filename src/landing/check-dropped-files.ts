import type { Result } from '../ingest/result'

// What the check reads off a dropped or chosen file. A browser File has both.
export type NamedFile = { readonly name: string; readonly type: string }

// Browsers disagree on a CSV's MIME type: Windows reports
// application/vnd.ms-excel when Excel is installed, and many systems report
// nothing at all.
const CSV_TYPES: ReadonlySet<string> = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  '',
])

const PLANNED = 'Concord reads .csv files; Excel and TSV support is planned.'

// Refuses anything but one CSV before a byte is read (SPEC.md, "File ingest").
// Whatever passes goes on to parseCsv, which has refusals of its own.
export function checkDroppedFiles<F extends NamedFile>(files: readonly F[]): Result<F, string> {
  const [first, ...rest] = files
  if (first === undefined) {
    return { ok: false, error: 'Nothing to read: drop a .csv file, or choose one.' }
  }
  if (rest.length > 0) {
    return {
      ok: false,
      error: 'Drop one file at a time. Concord reads a single CSV per session.',
    }
  }
  if (!first.name.toLowerCase().endsWith('.csv')) {
    return { ok: false, error: `${first.name} isn't a CSV. ${PLANNED}` }
  }
  if (!CSV_TYPES.has(first.type)) {
    return {
      ok: false,
      error: `${first.name} isn't a CSV: the browser reports it as ${first.type}. ${PLANNED}`,
    }
  }
  return { ok: true, value: first }
}
