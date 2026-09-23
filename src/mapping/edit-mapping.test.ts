import { describe, expect, test } from 'vitest'
import type { LongMapping, Mapping, WideMapping } from '../ingest/mapping'
import { parseCsv, type RawTable } from '../ingest/parse-csv'
import { columnRoles, editMapping, type MappingEdit } from './edit-mapping'

function table(csv: string): RawTable {
  const parsed = parseCsv(csv)
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.value
}

const longTable = table(
  ['item,rater,label,text', 'm1,alice,Low,a', 'm1,bob,High,a', 'm2,alice,Mid,b'].join('\n'),
)
const wideTable = table(
  ['item,text,alice,bob,carol', 'm1,a,Low,High,', 'm2,b,Mid,Low,NA'].join('\n'),
)

const long: LongMapping = {
  shape: 'long',
  itemColumn: 0,
  raterColumn: 1,
  labelColumn: 2,
  textColumn: 3,
  level: 'nominal',
  categoryOrder: [],
}

const wide: WideMapping = {
  shape: 'wide',
  itemColumn: 0,
  textColumn: 1,
  raterColumns: [2, 3, 4],
  level: 'nominal',
  categoryOrder: [],
}

function edit(raw: RawTable, mapping: Mapping, ...edits: MappingEdit[]): Mapping {
  return edits.reduce((current, next) => editMapping(raw, current, next), mapping)
}

describe('editMapping: shape', () => {
  test('switching long to wide makes every other column a rater', () => {
    expect(edit(longTable, long, { type: 'shape-chosen', shape: 'wide' })).toEqual({
      shape: 'wide',
      itemColumn: 0,
      textColumn: 3,
      raterColumns: [1, 2],
      level: 'nominal',
      categoryOrder: [],
    })
  })

  test('switching wide to long takes the first two free columns as rater and label', () => {
    expect(edit(wideTable, wide, { type: 'shape-chosen', shape: 'long' })).toEqual({
      shape: 'long',
      itemColumn: 0,
      textColumn: 1,
      raterColumn: 2,
      labelColumn: 3,
      level: 'nominal',
      categoryOrder: [],
    })
  })

  test('switching there and back restores a detected long mapping', () => {
    const shapes: MappingEdit[] = [
      { type: 'shape-chosen', shape: 'wide' },
      { type: 'shape-chosen', shape: 'long' },
    ]
    expect(edit(longTable, long, ...shapes)).toEqual(long)
  })

  test('choosing the current shape changes nothing', () => {
    expect(editMapping(longTable, long, { type: 'shape-chosen', shape: 'long' })).toBe(long)
  })
})

describe('editMapping: columns', () => {
  test('sets the item, rater and label columns of a long mapping', () => {
    expect(
      edit(
        longTable,
        long,
        { type: 'item-column-chosen', column: 3 },
        { type: 'rater-column-chosen', column: 2 },
        { type: 'label-column-chosen', column: 0 },
      ),
    ).toMatchObject({ itemColumn: 3, raterColumn: 2, labelColumn: 0 })
  })

  test('leaves a reused long column for the guardrails to report', () => {
    expect(edit(longTable, long, { type: 'rater-column-chosen', column: 0 })).toMatchObject({
      itemColumn: 0,
      raterColumn: 0,
    })
  })

  test('sets and clears the text column', () => {
    const cleared = edit(longTable, long, { type: 'text-column-chosen', column: undefined })
    expect(cleared).not.toHaveProperty('textColumn')
    expect(edit(longTable, cleared, { type: 'text-column-chosen', column: 3 })).toEqual(long)
  })

  test('a wide item or text column stops being a rater', () => {
    expect(
      edit(
        wideTable,
        wide,
        { type: 'item-column-chosen', column: 2 },
        { type: 'text-column-chosen', column: 4 },
      ),
    ).toMatchObject({ itemColumn: 2, textColumn: 4, raterColumns: [3] })
  })

  test('toggles wide rater columns, keeping them in file order', () => {
    const toggled = edit(
      wideTable,
      wide,
      { type: 'rater-column-toggled', column: 3 },
      { type: 'rater-column-toggled', column: 2 },
    )
    expect(toggled).toMatchObject({ raterColumns: [4] })
    expect(edit(wideTable, toggled, { type: 'rater-column-toggled', column: 2 })).toMatchObject({
      raterColumns: [2, 4],
    })
  })

  test('the item or text column cannot be toggled on as a rater', () => {
    expect(edit(wideTable, wide, { type: 'rater-column-toggled', column: 1 })).toBe(wide)
  })

  test('chooses all or none of the free columns as raters', () => {
    const none = edit(wideTable, wide, { type: 'no-rater-columns-chosen' })
    expect(none).toMatchObject({ raterColumns: [] })
    expect(edit(wideTable, none, { type: 'all-rater-columns-chosen' })).toEqual(wide)
  })

  test('rater edits leave a long mapping alone', () => {
    expect(editMapping(longTable, long, { type: 'all-rater-columns-chosen' })).toBe(long)
    expect(editMapping(longTable, long, { type: 'rater-column-toggled', column: 1 })).toBe(long)
  })

  test('long-only column edits leave a wide mapping alone', () => {
    expect(editMapping(wideTable, wide, { type: 'label-column-chosen', column: 2 })).toBe(wide)
    expect(editMapping(wideTable, wide, { type: 'rater-column-chosen', column: 2 })).toBe(wide)
  })
})

describe('editMapping: level and category order', () => {
  test('switching to ordinal prefills the order in first-seen order', () => {
    expect(edit(longTable, long, { type: 'level-chosen', level: 'ordinal' })).toMatchObject({
      level: 'ordinal',
      categoryOrder: ['Low', 'High', 'Mid'],
    })
    expect(edit(wideTable, wide, { type: 'level-chosen', level: 'ordinal' })).toMatchObject({
      categoryOrder: ['Low', 'High', 'Mid'],
    })
  })

  test('moves a category to a new place', () => {
    const ordinal = edit(
      longTable,
      long,
      { type: 'level-chosen', level: 'ordinal' },
      { type: 'category-moved', from: 1, to: 2 },
    )
    expect(ordinal).toMatchObject({ categoryOrder: ['Low', 'Mid', 'High'] })
    expect(edit(longTable, ordinal, { type: 'category-moved', from: 0, to: 2 })).toMatchObject({
      categoryOrder: ['Mid', 'High', 'Low'],
    })
  })

  test('a move off either end changes nothing', () => {
    const ordinal = edit(longTable, long, { type: 'level-chosen', level: 'ordinal' })
    expect(editMapping(longTable, ordinal, { type: 'category-moved', from: 0, to: -1 })).toBe(
      ordinal,
    )
    expect(editMapping(longTable, ordinal, { type: 'category-moved', from: 2, to: 3 })).toBe(
      ordinal,
    )
  })

  test('keeps the order through a round trip to nominal', () => {
    const ordered = edit(
      longTable,
      long,
      { type: 'level-chosen', level: 'ordinal' },
      { type: 'category-moved', from: 1, to: 2 },
      { type: 'level-chosen', level: 'nominal' },
      { type: 'level-chosen', level: 'ordinal' },
    )
    expect(ordered).toMatchObject({ categoryOrder: ['Low', 'Mid', 'High'] })
  })

  test('a column change drops labels that left and appends labels that arrived', () => {
    const ordinal = edit(
      wideTable,
      wide,
      { type: 'level-chosen', level: 'ordinal' },
      { type: 'category-moved', from: 1, to: 2 },
    )
    expect(ordinal).toMatchObject({ categoryOrder: ['Low', 'Mid', 'High'] })

    const withoutAlice = edit(wideTable, ordinal, { type: 'rater-column-toggled', column: 2 })
    expect(withoutAlice).toMatchObject({ categoryOrder: ['Low', 'High'] })

    const textAsRater = edit(
      wideTable,
      withoutAlice,
      { type: 'text-column-chosen', column: undefined },
      { type: 'rater-column-toggled', column: 1 },
    )
    expect(textAsRater).toMatchObject({ categoryOrder: ['Low', 'High', 'a', 'b'] })
  })

  test('a nominal mapping keeps its order untouched', () => {
    const nominal = edit(
      longTable,
      long,
      { type: 'level-chosen', level: 'ordinal' },
      { type: 'level-chosen', level: 'nominal' },
      { type: 'label-column-chosen', column: 3 },
    )
    expect(nominal).toMatchObject({ level: 'nominal', categoryOrder: ['Low', 'High', 'Mid'] })
  })
})

describe('columnRoles', () => {
  test('names each column of a long mapping', () => {
    expect([0, 1, 2, 3].map((column) => columnRoles(long, column))).toEqual([
      ['item'],
      ['rater'],
      ['label'],
      ['text'],
    ])
  })

  test('names rater columns and leaves unmapped columns empty', () => {
    const mapping: WideMapping = { ...wide, raterColumns: [2, 4] }
    expect([0, 1, 2, 3, 4].map((column) => columnRoles(mapping, column))).toEqual([
      ['item'],
      ['text'],
      ['rater'],
      [],
      ['rater'],
    ])
  })

  test('lists every role a reused column plays', () => {
    expect(columnRoles({ ...long, raterColumn: 0 }, 0)).toEqual(['item', 'rater'])
  })
})
