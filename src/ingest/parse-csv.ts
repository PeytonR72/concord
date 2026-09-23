import Papa from 'papaparse'
import type { Result } from './result'

// A CSV as read, before any mapping. Columns are positional: headers may be
// blank or repeated, so later steps refer to a column by its index.
export type RawTable = {
  headers: readonly string[]
  rows: readonly (readonly string[])[]
  // lineNumbers[i] is the file line rows[i] starts on, counting from 1, so
  // messages can point at a row even after blank lines were skipped.
  lineNumbers: readonly number[]
}

type SourceRecord = { cells: unknown; line: number; quoteError: boolean }

export function parseCsv(text: string): Result<RawTable, string> {
  const records = readRecords(text)

  const parsed: { cells: string[]; line: number }[] = []
  for (const { cells, line, quoteError } of records) {
    if (quoteError) {
      return { ok: false, error: `Line ${line} has a quoted field that never closes.` }
    }
    if (!isStringArray(cells)) {
      return { ok: false, error: `Line ${line} could not be read.` }
    }
    if (cells.some((cell) => cell.trim() !== '')) parsed.push({ cells, line })
  }

  const [headerRecord, ...dataRecords] = parsed
  if (headerRecord === undefined) {
    return { ok: false, error: 'The file is empty.' }
  }

  const headers = headerRecord.cells.map((header) => header.trim())
  const rows: string[][] = []
  const lineNumbers: number[] = []
  for (const { cells, line } of dataRecords) {
    if (cells.length > headers.length) {
      return {
        ok: false,
        error: `Line ${line} has ${cells.length} cells but the header has ${headers.length}.`,
      }
    }
    // A short row is read as trailing empty cells, which later count as missing.
    rows.push([...cells, ...Array<string>(headers.length - cells.length).fill('')])
    lineNumbers.push(line)
  }

  return { ok: true, value: { headers, rows, lineNumbers } }
}

export async function readCsvFile(file: File): Promise<Result<RawTable, string>> {
  return parseCsv(await file.text())
}

// Every record with the line it starts on. Papa Parse's cursor sits just past
// each record's line break, so a record starts one line after the newlines
// consumed before it; quoted line breaks inside a record are counted too.
function readRecords(text: string): SourceRecord[] {
  const input = text.startsWith('﻿') ? text.slice(1) : text
  const records: SourceRecord[] = []
  let line = 1
  let consumed = 0

  Papa.parse<unknown>(input, {
    delimiter: ',',
    step: (row) => {
      records.push({
        cells: row.data,
        line,
        quoteError: row.errors.some((error) => error.type === 'Quotes'),
      })
      line += countNewlines(input.slice(consumed, row.meta.cursor))
      consumed = row.meta.cursor
    },
  })

  return records
}

function countNewlines(text: string): number {
  return text.split('\n').length - 1
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((cell) => typeof cell === 'string')
}
