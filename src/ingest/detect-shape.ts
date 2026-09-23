import type { LongMapping, Mapping, WideMapping } from './mapping'

const ITEM_HEADERS = ['item', 'id', 'unit', 'item_id']
const RATER_HEADERS = ['rater', 'annotator', 'coder', 'worker']
const LABEL_HEADERS = ['label', 'category', 'rating', 'annotation']
const TEXT_HEADERS = ['text', 'content', 'message', 'sentence']

// The level can't be read from headers, so detection always proposes nominal.
const NOMINAL: Pick<Mapping, 'level' | 'categoryOrder'> = {
  level: 'nominal',
  categoryOrder: [],
}

// Proposes a mapping from the headers alone (SPEC.md, "Shape detection"). It
// only prefills the mapping screen, where every field stays editable.
export function detectShape(headers: readonly string[]): Mapping {
  return detectLong(headers) ?? detectWide(headers)
}

function detectLong(headers: readonly string[]): LongMapping | undefined {
  if (headers.length !== 3 && headers.length !== 4) return undefined

  const itemColumn = findColumn(headers, ITEM_HEADERS)
  const raterColumn = findColumn(headers, RATER_HEADERS)
  const labelColumn = findColumn(headers, LABEL_HEADERS)
  if (itemColumn === undefined || raterColumn === undefined || labelColumn === undefined) {
    return undefined
  }

  const textColumn = findColumn(headers, TEXT_HEADERS, [itemColumn, raterColumn, labelColumn])
  return {
    shape: 'long',
    itemColumn,
    raterColumn,
    labelColumn,
    ...(textColumn === undefined ? {} : { textColumn }),
    ...NOMINAL,
  }
}

function detectWide(headers: readonly string[]): WideMapping {
  const itemColumn = 0
  const textColumn = findColumn(headers, TEXT_HEADERS, [itemColumn])
  const raterColumns = headers
    .map((_, index) => index)
    .filter((index) => index !== itemColumn && index !== textColumn)

  return {
    shape: 'wide',
    itemColumn,
    raterColumns,
    ...(textColumn === undefined ? {} : { textColumn }),
    ...NOMINAL,
  }
}

// The first column, outside `taken`, whose header matches one of `patterns`.
function findColumn(
  headers: readonly string[],
  patterns: readonly string[],
  taken: readonly number[] = [],
): number | undefined {
  const index = headers.findIndex(
    (header, index) => !taken.includes(index) && patterns.includes(header.trim().toLowerCase()),
  )
  return index === -1 ? undefined : index
}
