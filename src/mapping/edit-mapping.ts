import type { Level } from '../dataset/dataset'
import { mappedLabels } from '../ingest/map-dataset'
import type { LongMapping, Mapping, Shape, WideMapping } from '../ingest/mapping'
import type { RawTable } from '../ingest/parse-csv'

// One change the mapping screen makes. Columns are indices into the headers.
export type MappingEdit =
  | { type: 'shape-chosen'; shape: Shape }
  | { type: 'item-column-chosen'; column: number }
  | { type: 'text-column-chosen'; column: number | undefined }
  // Long only.
  | { type: 'rater-column-chosen'; column: number }
  | { type: 'label-column-chosen'; column: number }
  // Wide only.
  | { type: 'rater-column-toggled'; column: number }
  | { type: 'all-rater-columns-chosen' }
  | { type: 'no-rater-columns-chosen' }
  | { type: 'level-chosen'; level: Level }
  | { type: 'category-moved'; from: number; to: number }

// Applies one edit. Choices that clash, such as one column in two roles, are
// kept as chosen for the guardrails to name, with one exception: a wide item or
// text column stops being a rater, since those are checkboxes beside the
// selects. An ordinal order follows the labels the mapping reads: labels that
// left are dropped, and labels that arrived join the end in first-seen order.
export function editMapping(table: RawTable, mapping: Mapping, edit: MappingEdit): Mapping {
  const edited = applyEdit(table.headers.length, mapping, edit)
  // A move reorders labels without changing them, so it skips the table scan.
  if (edited === mapping || edited.level !== 'ordinal' || edit.type === 'category-moved') {
    return edited
  }

  const labels = mappedLabels(table, edited)
  const kept = edited.categoryOrder.filter((category) => labels.includes(category))
  const arrived = labels.filter((label) => !kept.includes(label))
  const categoryOrder = [...kept, ...arrived]
  return sameStrings(categoryOrder, edited.categoryOrder) ? edited : { ...edited, categoryOrder }
}

// The roles a column plays under a mapping, more than one when it is reused.
export function columnRoles(mapping: Mapping, column: number): ColumnRole[] {
  const roles: ColumnRole[] = []
  if (mapping.itemColumn === column) roles.push('item')
  if (mapping.shape === 'long') {
    if (mapping.raterColumn === column) roles.push('rater')
    if (mapping.labelColumn === column) roles.push('label')
  } else if (mapping.raterColumns.includes(column)) {
    roles.push('rater')
  }
  if (mapping.textColumn === column) roles.push('text')
  return roles
}

export type ColumnRole = 'item' | 'rater' | 'label' | 'text'

function applyEdit(width: number, mapping: Mapping, edit: MappingEdit): Mapping {
  switch (edit.type) {
    case 'shape-chosen':
      if (edit.shape === 'wide') return mapping.shape === 'long' ? toWide(width, mapping) : mapping
      return mapping.shape === 'wide' ? toLong(width, mapping) : mapping

    case 'item-column-chosen':
      return withoutRater({ ...mapping, itemColumn: edit.column }, edit.column)

    case 'text-column-chosen': {
      const { textColumn: _previous, ...rest } = mapping
      if (edit.column === undefined) return rest
      return withoutRater({ ...rest, textColumn: edit.column }, edit.column)
    }

    case 'rater-column-chosen':
      return mapping.shape === 'long' ? { ...mapping, raterColumn: edit.column } : mapping

    case 'label-column-chosen':
      return mapping.shape === 'long' ? { ...mapping, labelColumn: edit.column } : mapping

    case 'rater-column-toggled': {
      if (mapping.shape !== 'wide' || !freeColumns(width, mapping).includes(edit.column)) {
        return mapping
      }
      const { raterColumns } = mapping
      const raters = raterColumns.includes(edit.column)
        ? raterColumns.filter((column) => column !== edit.column)
        : [...raterColumns, edit.column].sort((a, b) => a - b)
      return { ...mapping, raterColumns: raters }
    }

    case 'all-rater-columns-chosen':
      return mapping.shape === 'wide'
        ? { ...mapping, raterColumns: freeColumns(width, mapping) }
        : mapping

    case 'no-rater-columns-chosen':
      return mapping.shape === 'wide' ? { ...mapping, raterColumns: [] } : mapping

    case 'level-chosen':
      return edit.level === mapping.level ? mapping : { ...mapping, level: edit.level }

    case 'category-moved': {
      const order = mapping.categoryOrder
      const moved = order[edit.from]
      if (moved === undefined || edit.to < 0 || edit.to >= order.length) return mapping
      const categoryOrder = order.filter((_, index) => index !== edit.from)
      categoryOrder.splice(edit.to, 0, moved)
      return { ...mapping, categoryOrder }
    }
  }
}

function toWide(width: number, mapping: LongMapping): WideMapping {
  const { raterColumn: _rater, labelColumn: _label, ...common } = mapping
  return { ...common, shape: 'wide', raterColumns: freeColumns(width, mapping) }
}

// A column the guardrails will report as reused stands in when the file has
// too few columns for a rater and a label.
function toLong(width: number, mapping: WideMapping): LongMapping {
  const { raterColumns: _raters, ...common } = mapping
  const [raterColumn = mapping.itemColumn, labelColumn = raterColumn] = freeColumns(width, mapping)
  return { ...common, shape: 'long', raterColumn, labelColumn }
}

// Columns that are neither the item nor the text column.
function freeColumns(width: number, mapping: Mapping): number[] {
  return Array.from({ length: width }, (_, column) => column).filter(
    (column) => column !== mapping.itemColumn && column !== mapping.textColumn,
  )
}

function withoutRater(mapping: Mapping, column: number): Mapping {
  if (mapping.shape === 'long') return mapping
  return { ...mapping, raterColumns: mapping.raterColumns.filter((rater) => rater !== column) }
}

function sameStrings(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}
