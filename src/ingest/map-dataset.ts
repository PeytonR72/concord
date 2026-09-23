import type { Dataset, Item } from '../dataset/dataset'
import {
  checkDataset,
  EXAMPLE_LIMIT,
  type Blocking,
  type RepeatedRating,
  type RepeatedRow,
  type Warning,
} from './guardrails'
import type { LongMapping, Mapping, WideMapping } from './mapping'
import type { RawTable } from './parse-csv'
import type { Result } from './result'

// Warnings travel beside the result rather than inside it, because the mapping
// screen shows them next to blocking errors as well as on success.
export type MappedDataset = {
  result: Result<Dataset, readonly Blocking[]>
  warnings: readonly Warning[]
}

const MISSING_TOKENS = new Set(['', 'na', 'n/a', 'null'])

// Applies a mapping to a table (SPEC.md, "Data format"). Items and nominal
// categories are first-seen in reading order: row by row, and within a wide
// row, across the rater columns in mapping order. Raters are first-seen in a
// long file and in mapping order in a wide one. So a long file that lists each
// item's ratings together, in the wide file's rater order, maps to the same
// Dataset as that wide file.
export function mapDataset(table: RawTable, mapping: Mapping): MappedDataset {
  // Nominal categories are first-seen, so only an ordinal mapping has an order.
  const order =
    mapping.level === 'ordinal' ? mapping.categoryOrder.map((category) => category.trim()) : []
  const invalid = checkMapping(table.headers.length, mapping, order)
  if (invalid.length > 0) return { result: { ok: false, error: invalid }, warnings: [] }

  const reader = new TableReader(mapping.textColumn)
  if (mapping.shape === 'long') readLong(table, mapping, reader)
  else readWide(table, mapping, reader)

  const labels = [...reader.labels]
  const unordered = mapping.level === 'ordinal' ? labels.filter((label) => !order.includes(label)) : []
  // Unordered labels block, but are placed after the order so the remaining
  // guardrails can still run on a whole dataset.
  const categories = mapping.level === 'ordinal' ? [...order, ...unordered] : labels
  const categoryIndex = new Map(categories.map((category, index) => [category, index]))

  const ratings = reader.raters.map(() => reader.items.map((): number | null => null))
  for (const { item, rater, label } of reader.ratings) {
    const row = ratings[rater]
    if (row !== undefined) row[item] = label === null ? null : (categoryIndex.get(label) ?? null)
  }

  const dataset: Dataset = {
    items: reader.items,
    raters: reader.raters,
    categories,
    level: mapping.level,
    ratings,
  }

  const blocking: Blocking[] = [...reader.blocking()]
  if (unordered.length > 0) blocking.push({ kind: 'unordered-labels', labels: unordered })
  const checked = checkDataset(dataset)
  blocking.push(...checked.blocking)
  const warnings = [...reader.warnings(), ...checked.warnings]

  return {
    result: blocking.length > 0 ? { ok: false, error: blocking } : { ok: true, value: dataset },
    warnings,
  }
}

// The distinct labels under a mapping's label column (long) or rater columns
// (wide), in the order mapDataset first sees them: what the mapping screen
// offers for ordering. Rows mapDataset would skip still contribute, so the
// list may hold a label no rating ends up with, but never misses one.
export function mappedLabels(table: RawTable, mapping: Mapping): string[] {
  const columns = mapping.shape === 'long' ? [mapping.labelColumn] : mapping.raterColumns
  const labels = new Set<string>()
  for (const row of table.rows) {
    for (const column of columns) {
      const label = labelOf(cell(row, column))
      if (label !== null) labels.add(label)
    }
  }
  return [...labels]
}

// Problems that stop the mapping from being applied at all. The mapping screen
// shouldn't produce them, but the mapping arrives here as a plain value.
function checkMapping(width: number, mapping: Mapping, order: readonly string[]): Blocking[] {
  const problems: Blocking[] = []

  const columns = [
    mapping.itemColumn,
    ...(mapping.textColumn === undefined ? [] : [mapping.textColumn]),
    ...(mapping.shape === 'long' ? [mapping.raterColumn, mapping.labelColumn] : mapping.raterColumns),
  ]
  for (const column of columns) {
    if (!Number.isInteger(column) || column < 0 || column >= width) {
      problems.push({ kind: 'column-out-of-range', column })
    }
  }
  for (const column of repeated(columns)) problems.push({ kind: 'column-reused', column })

  for (const category of repeated(order)) problems.push({ kind: 'category-repeated', category })

  return problems
}

function readLong(table: RawTable, mapping: LongMapping, reader: TableReader): void {
  table.rows.forEach((row, index) => {
    const line = table.lineNumbers[index] ?? 0
    const id = cell(row, mapping.itemColumn).trim()
    const rater = cell(row, mapping.raterColumn).trim()
    if (id === '') return reader.emptyItemId(line)
    if (rater === '') return reader.emptyRater(line)

    const item = reader.item(id, line, row)
    reader.rate(item, reader.rater(rater), cell(row, mapping.labelColumn), line)
  })
}

function readWide(table: RawTable, mapping: WideMapping, reader: TableReader): void {
  const raters = raterNames(table.headers, mapping.raterColumns).map((name) => reader.rater(name))

  table.rows.forEach((row, index) => {
    const line = table.lineNumbers[index] ?? 0
    const id = cell(row, mapping.itemColumn).trim()
    if (id === '') return reader.emptyItemId(line)
    if (reader.repeatsItem(id, line)) return

    const item = reader.item(id, line, row)
    mapping.raterColumns.forEach((column, position) => {
      const rater = raters[position]
      if (rater !== undefined) reader.rate(item, rater, cell(row, column), line)
    })
  })
}

// Rater names from wide headers. A blank header is named after its column; a
// repeated name takes the next free suffix, so every rater stays distinct.
function raterNames(headers: readonly string[], columns: readonly number[]): string[] {
  const taken = new Set<string>()
  return columns.map((column) => {
    const header = headers[column] ?? ''
    const base = header === '' ? `Column ${column + 1}` : header
    let name = base
    for (let suffix = 2; taken.has(name); suffix += 1) name = `${base} (${suffix})`
    taken.add(name)
    return name
  })
}

// Collects items, raters and ratings from rows in reading order, along with
// the row problems found on the way.
class TableReader {
  readonly items: Item[] = []
  readonly raters: string[] = []
  readonly labels = new Set<string>()
  readonly ratings: { item: number; rater: number; label: string | null }[] = []

  private readonly emptyItemIds: number[] = []
  private readonly emptyRaters: number[] = []
  private readonly duplicateItems: RepeatedRow[] = []
  private readonly duplicateRatings: RepeatedRating[] = []
  private readonly conflictingTexts: RepeatedRow[] = []

  private readonly itemIndex = new Map<string, number>()
  // The line each item was first seen on.
  private readonly itemLines = new Map<string, number>()
  private readonly raterIndex = new Map<string, number>()
  private readonly ratingLines = new Map<string, number>()
  private readonly textLines = new Map<number, number>()
  private readonly textColumn: number | undefined

  constructor(textColumn: number | undefined) {
    this.textColumn = textColumn
  }

  emptyItemId(line: number): void {
    this.emptyItemIds.push(line)
  }

  emptyRater(line: number): void {
    this.emptyRaters.push(line)
  }

  // Wide only: whether an earlier row already had this item, recording it if so.
  repeatsItem(id: string, line: number): boolean {
    const firstLine = this.itemLines.get(id)
    if (firstLine === undefined) return false
    this.duplicateItems.push({ item: id, line, firstLine })
    return true
  }

  // The item's index, adding it on first sight. The first non-empty text wins.
  item(id: string, line: number, row: readonly string[]): number {
    let index = this.itemIndex.get(id)
    if (index === undefined) {
      index = this.items.push({ id }) - 1
      this.itemIndex.set(id, index)
      this.itemLines.set(id, line)
    }

    const text = this.textColumn === undefined ? '' : cell(row, this.textColumn).trim()
    const item = this.items[index]
    if (text !== '' && item !== undefined) {
      if (item.text === undefined) {
        this.items[index] = { id, text }
        this.textLines.set(index, line)
      } else if (item.text !== text) {
        this.conflictingTexts.push({ item: id, line, firstLine: this.textLines.get(index) ?? line })
      }
    }
    return index
  }

  rater(name: string): number {
    let index = this.raterIndex.get(name)
    if (index === undefined) {
      index = this.raters.push(name) - 1
      this.raterIndex.set(name, index)
    }
    return index
  }

  // Records a rating; the first rating of an (item, rater) pair wins.
  rate(item: number, rater: number, raw: string, line: number): void {
    const key = `${item}:${rater}`
    const firstLine = this.ratingLines.get(key)
    if (firstLine !== undefined) {
      this.duplicateRatings.push({
        item: this.items[item]?.id ?? '',
        rater: this.raters[rater] ?? '',
        line,
        firstLine,
      })
      return
    }
    this.ratingLines.set(key, line)

    const label = labelOf(raw)
    if (label !== null) this.labels.add(label)
    this.ratings.push({ item, rater, label })
  }

  blocking(): Blocking[] {
    const blocking: Blocking[] = []
    if (this.emptyItemIds.length > 0) {
      blocking.push({ kind: 'empty-item-id', ...lines(this.emptyItemIds) })
    }
    if (this.emptyRaters.length > 0) {
      blocking.push({ kind: 'empty-rater', ...lines(this.emptyRaters) })
    }
    if (this.duplicateRatings.length > 0) {
      blocking.push({ kind: 'duplicate-rating', ...examples(this.duplicateRatings) })
    }
    if (this.duplicateItems.length > 0) {
      blocking.push({ kind: 'duplicate-item', ...examples(this.duplicateItems) })
    }
    return blocking
  }

  warnings(): Warning[] {
    return this.conflictingTexts.length > 0
      ? [{ kind: 'conflicting-text', ...examples(this.conflictingTexts) }]
      : []
  }
}

function lines(all: readonly number[]): { count: number; lines: number[] } {
  return { count: all.length, lines: all.slice(0, EXAMPLE_LIMIT) }
}

function examples<T>(all: readonly T[]): { count: number; examples: T[] } {
  return { count: all.length, examples: all.slice(0, EXAMPLE_LIMIT) }
}

// A cell as a label: trimmed, or null when it holds a missing token.
function labelOf(raw: string): string | null {
  const trimmed = raw.trim()
  return MISSING_TOKENS.has(trimmed.toLowerCase()) ? null : trimmed
}

function cell(row: readonly string[], column: number): string {
  return row[column] ?? ''
}

// Each value that occurs more than once, reported once.
function repeated<T>(values: readonly T[]): T[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))]
}
