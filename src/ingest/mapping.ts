import type { Level } from '../dataset/dataset'

// The user-confirmed choice that turns a RawTable into a Dataset. Columns are
// indices into RawTable.headers, since headers may be blank or repeated.
export type Mapping = LongMapping | WideMapping

// One rating per row.
export type LongMapping = MappingCommon & {
  shape: 'long'
  raterColumn: number
  labelColumn: number
}

// One item per row, one column per rater.
export type WideMapping = MappingCommon & {
  shape: 'wide'
  raterColumns: readonly number[]
}

type MappingCommon = {
  itemColumn: number
  textColumn?: number
  level: Level
  // Ordinal only: categories from first to last, covering every label in the
  // data. A nominal dataset ignores it and uses first-seen order.
  categoryOrder: readonly string[]
}
