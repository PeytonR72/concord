import { describe, expect, test } from 'vitest'
import type { Dataset } from '../dataset/dataset'
import type { Blocking, Warning } from './guardrails'
import { mapDataset } from './map-dataset'
import type { LongMapping, Mapping, WideMapping } from './mapping'
import { parseCsv, type RawTable } from './parse-csv'

function table(csv: string): RawTable {
  const parsed = parseCsv(csv)
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.value
}

function long(overrides: Partial<LongMapping> = {}): LongMapping {
  return {
    shape: 'long',
    itemColumn: 0,
    raterColumn: 1,
    labelColumn: 2,
    level: 'nominal',
    categoryOrder: [],
    ...overrides,
  }
}

function wide(raterColumns: readonly number[], overrides: Partial<WideMapping> = {}): WideMapping {
  return {
    shape: 'wide',
    itemColumn: 0,
    raterColumns,
    level: 'nominal',
    categoryOrder: [],
    ...overrides,
  }
}

function dataset(csv: string, mapping: Mapping): Dataset {
  const { result } = mapDataset(table(csv), mapping)
  if (!result.ok) throw new Error(JSON.stringify(result.error))
  return result.value
}

function blocking(csv: string, mapping: Mapping): readonly Blocking[] {
  const { result } = mapDataset(table(csv), mapping)
  return result.ok ? [] : result.error
}

function warnings(csv: string, mapping: Mapping): readonly Warning[] {
  return mapDataset(table(csv), mapping).warnings
}

describe('mapDataset: long', () => {
  test('builds items, raters and categories in first-seen order', () => {
    const csv = [
      'item,rater,label',
      'm1,alice,Negative',
      'm1,bob,Sarcastic',
      'm2,bob,Negative',
      'm2,carol,Positive',
    ].join('\n')

    expect(dataset(csv, long())).toEqual({
      items: [{ id: 'm1' }, { id: 'm2' }],
      raters: ['alice', 'bob', 'carol'],
      categories: ['Negative', 'Sarcastic', 'Positive'],
      level: 'nominal',
      ratings: [
        [0, null],
        [1, 0],
        [null, 2],
      ],
    })
  })

  test.each(['', 'NA', 'n/a', 'NULL', '  na  '])('reads %j as a missing rating', (token) => {
    const csv = `item,rater,label\nm1,alice,A\nm1,bob,${token}\nm2,alice,B\nm2,bob,A`

    const { raters, categories, ratings } = dataset(csv, long())

    expect(raters).toEqual(['alice', 'bob'])
    expect(categories).toEqual(['A', 'B'])
    expect(ratings[1]).toEqual([null, 0])
  })

  test('trims labels but never coerces numbers', () => {
    const csv = 'item,rater,label\nm1,alice, 1 \nm1,bob,1.0\nm2,alice,1\nm2,bob,1.0'

    expect(dataset(csv, long()).categories).toEqual(['1', '1.0'])
  })

  test('trims item ids and rater names', () => {
    const csv = 'item,rater,label\n m1 , alice ,A\nm1,bob,B'

    const { items, raters } = dataset(csv, long())

    expect(items).toEqual([{ id: 'm1' }])
    expect(raters).toEqual(['alice', 'bob'])
  })

  test('reads the text column, omitting text when the item has none', () => {
    const csv = [
      'item,rater,label,text',
      'm1,alice,A,"Great, another outage."',
      'm1,bob,B,"Great, another outage."',
      'm2,alice,A,',
      'm2,bob,A,  ',
    ].join('\n')

    expect(dataset(csv, long({ textColumn: 3 })).items).toEqual([
      { id: 'm1', text: 'Great, another outage.' },
      { id: 'm2' },
    ])
  })

  test('takes the first non-empty text, so a blank cell is not a conflict', () => {
    const csv = 'item,rater,label,text\nm1,alice,A,\nm1,bob,B,Hello'
    const mapping = long({ textColumn: 3 })

    expect(dataset(csv, mapping).items).toEqual([{ id: 'm1', text: 'Hello' }])
    expect(warnings(csv, mapping)).toEqual([])
  })
})

describe('mapDataset: wide', () => {
  test('builds raters in column order and items in row order', () => {
    const csv = 'item,text,alice,bob,carol\nm1,"Great, another outage.",Negative,Sarcastic,\nm2,,NA,Negative,Positive'

    expect(dataset(csv, wide([2, 3, 4], { textColumn: 1 }))).toEqual({
      items: [{ id: 'm1', text: 'Great, another outage.' }, { id: 'm2' }],
      raters: ['alice', 'bob', 'carol'],
      categories: ['Negative', 'Sarcastic', 'Positive'],
      level: 'nominal',
      ratings: [
        [0, null],
        [1, 0],
        [null, 2],
      ],
    })
  })

  test('follows the mapping order of rater columns, not the file order', () => {
    const csv = 'item,alice,bob\nm1,A,B'

    const { raters, categories, ratings } = dataset(csv, wide([2, 1]))

    expect(raters).toEqual(['bob', 'alice'])
    expect(categories).toEqual(['B', 'A'])
    expect(ratings).toEqual([[0], [1]])
  })

  test('names a blank rater header after its column position', () => {
    const csv = 'item,alice,\nm1,A,B'

    expect(dataset(csv, wide([1, 2])).raters).toEqual(['alice', 'Column 3'])
  })

  test('suffixes repeated rater headers so every rater name is unique', () => {
    const csv = 'item,alice,alice,alice (2),alice\nm1,A,B,A,B'

    expect(dataset(csv, wide([1, 2, 3, 4])).raters).toEqual([
      'alice',
      'alice (2)',
      'alice (2) (2)',
      'alice (3)',
    ])
  })
})

describe('mapDataset: long and wide agree', () => {
  // The same ratings in both shapes. Items and categories are first-seen in
  // reading order: long reads row by row, wide reads each item row across its
  // rater columns. So the two traversals meet exactly when the long file lists
  // each item's ratings together, in the wide file's rater column order. Rater
  // order is first-seen in long and column order in wide, which that same
  // listing also makes equal.
  const longCsv = [
    'item,rater,label,text',
    'm1,alice,Negative,"Great, another outage."',
    'm1,bob,Sarcastic,"Great, another outage."',
    'm2,alice,NA,Thanks!',
    'm2,bob,Positive,Thanks!',
    'm2,carol,Positive,Thanks!',
    'm3,bob,Neutral,',
    'm3,carol,Negative,',
  ].join('\n')
  const wideCsv = [
    'item,text,alice,bob,carol',
    'm1,"Great, another outage.",Negative,Sarcastic,',
    'm2,Thanks!,NA,Positive,Positive',
    'm3,,,Neutral,Negative',
  ].join('\n')

  test('nominal', () => {
    const fromLong = dataset(longCsv, long({ textColumn: 3 }))
    const fromWide = dataset(wideCsv, wide([2, 3, 4], { textColumn: 1 }))

    expect(fromWide).toEqual(fromLong)
    expect(fromLong.categories).toEqual(['Negative', 'Sarcastic', 'Positive', 'Neutral'])
  })

  test('ordinal', () => {
    const categoryOrder = ['Negative', 'Sarcastic', 'Neutral', 'Positive']
    const fromLong = dataset(longCsv, long({ textColumn: 3, level: 'ordinal', categoryOrder }))
    const fromWide = dataset(
      wideCsv,
      wide([2, 3, 4], { textColumn: 1, level: 'ordinal', categoryOrder }),
    )

    expect(fromWide).toEqual(fromLong)
    expect(fromLong.categories).toEqual(categoryOrder)
  })
})

describe('mapDataset: category order', () => {
  const csv = 'item,rater,label\nm1,alice,low\nm1,bob,high\nm2,alice,mid\nm2,bob,mid'

  test('ordinal uses the user order for category indices', () => {
    const mapped = dataset(csv, long({ level: 'ordinal', categoryOrder: ['low', 'mid', 'high'] }))

    expect(mapped.level).toBe('ordinal')
    expect(mapped.categories).toEqual(['low', 'mid', 'high'])
    expect(mapped.ratings).toEqual([
      [0, 1],
      [2, 1],
    ])
  })

  test('ordinal keeps ordered categories that no one used', () => {
    const categoryOrder = ['none', 'low', 'mid', 'high', 'max']

    expect(dataset(csv, long({ level: 'ordinal', categoryOrder })).categories).toEqual(
      categoryOrder,
    )
  })

  test('ordinal blocks on data labels the order leaves out', () => {
    expect(blocking(csv, long({ level: 'ordinal', categoryOrder: ['low'] }))).toEqual([
      { kind: 'unordered-labels', labels: ['high', 'mid'] },
    ])
  })

  test('ordinal with no order blocks and lists every label', () => {
    expect(blocking(csv, long({ level: 'ordinal', categoryOrder: [] }))).toEqual([
      { kind: 'unordered-labels', labels: ['low', 'high', 'mid'] },
    ])
  })

  test('ordinal blocks a category named twice in the order', () => {
    const mapping = long({ level: 'ordinal', categoryOrder: ['low', 'mid', 'low', 'high'] })

    expect(blocking(csv, mapping)).toEqual([{ kind: 'category-repeated', category: 'low' }])
  })

  test('nominal ignores any category order and uses first-seen', () => {
    const mapping = long({ level: 'nominal', categoryOrder: ['mid', 'high', 'low'] })

    expect(dataset(csv, mapping).categories).toEqual(['low', 'high', 'mid'])
  })
})

describe('mapDataset: invalid mapping', () => {
  const csv = 'item,rater,label\nm1,alice,A\nm1,bob,B'

  test('blocks a column past the header', () => {
    expect(blocking(csv, long({ labelColumn: 3 }))).toEqual([
      { kind: 'column-out-of-range', column: 3 },
    ])
  })

  test('blocks a negative or fractional column', () => {
    expect(blocking(csv, long({ itemColumn: -1, textColumn: 1.5 }))).toEqual([
      { kind: 'column-out-of-range', column: -1 },
      { kind: 'column-out-of-range', column: 1.5 },
    ])
  })

  test('blocks a column used twice', () => {
    expect(blocking(csv, long({ raterColumn: 0 }))).toEqual([
      { kind: 'column-reused', column: 0 },
    ])
    expect(blocking('item,a,b\nm1,A,B', wide([1, 2, 1]))).toEqual([
      { kind: 'column-reused', column: 1 },
    ])
  })
})

describe('mapDataset: row problems', () => {
  test('long: blocks an empty item id, listing the first 5 lines', () => {
    const rows = Array.from({ length: 6 }, (_, index) => `  ,rater${index},A`)
    const csv = ['item,rater,label', 'm1,alice,A', 'm1,bob,B', ...rows].join('\n')

    expect(blocking(csv, long())).toEqual([
      { kind: 'empty-item-id', count: 6, lines: [4, 5, 6, 7, 8] },
    ])
  })

  test('long: blocks an empty rater name, listing the first 5 lines', () => {
    const rows = Array.from({ length: 6 }, (_, index) => `m${index}, ,A`)
    const csv = ['item,rater,label', 'm1,alice,A', 'm1,bob,B', ...rows].join('\n')

    expect(blocking(csv, long())).toEqual([
      { kind: 'empty-rater', count: 6, lines: [4, 5, 6, 7, 8] },
    ])
  })

  test('wide: blocks an empty item id', () => {
    const csv = 'item,alice,bob\nm1,A,B\n,A,A'

    expect(blocking(csv, wide([1, 2]))).toEqual([{ kind: 'empty-item-id', count: 1, lines: [3] }])
  })

  test('wide: blocks an item id on two rows, listing the first 5', () => {
    const repeats = Array.from({ length: 6 }, () => 'm1,A,A')
    const csv = ['item,alice,bob', 'm1,A,B', 'm2,A,B', ...repeats].join('\n')

    expect(blocking(csv, wide([1, 2]))).toEqual([
      {
        kind: 'duplicate-item',
        count: 6,
        examples: [4, 5, 6, 7, 8].map((line) => ({ item: 'm1', line, firstLine: 2 })),
      },
    ])
  })
})

describe('mapDataset: guardrails (SPEC.md)', () => {
  test('fewer than 2 raters blocks', () => {
    const csv = 'item,rater,label\nm1,alice,A\nm2,alice,B'

    expect(blocking(csv, long())).toContainEqual({ kind: 'too-few-raters', raters: 1 })
  })

  test('a rater with no ratings does not count toward 2 raters', () => {
    const csv = 'item,alice,bob\nm1,A,\nm2,B,NA'

    const { result } = mapDataset(table(csv), wide([1, 2]))

    expect(result.ok || result.error).toContainEqual({ kind: 'too-few-raters', raters: 1 })
  })

  test('fewer than 2 distinct labels blocks', () => {
    const csv = 'item,rater,label\nm1,alice,A\nm1,bob,A\nm2,alice,A\nm2,bob,NA'

    expect(blocking(csv, long())).toEqual([{ kind: 'too-few-labels', labels: ['A'] }])
  })

  test('long: a duplicate (item, rater) pair blocks, listing the first 5 with lines', () => {
    const repeats = Array.from({ length: 6 }, (_, index) => `m1,alice,${index % 2 ? 'A' : 'B'}`)
    const csv = ['item,rater,label', 'm1,alice,A', 'm1,bob,B', ...repeats].join('\n')

    expect(blocking(csv, long())).toEqual([
      {
        kind: 'duplicate-rating',
        count: 6,
        examples: [4, 5, 6, 7, 8].map((line) => ({
          item: 'm1',
          rater: 'alice',
          line,
          firstLine: 2,
        })),
      },
    ])
  })

  test('no item with 2+ labels blocks', () => {
    const csv = 'item,rater,label\nm1,alice,A\nm1,bob,NA\nm2,alice,NA\nm2,bob,B'

    expect(blocking(csv, long())).toEqual([{ kind: 'no-pairable-item' }])
  })

  test('more than 20 distinct labels warns', () => {
    const labels = Array.from({ length: 21 }, (_, index) => `L${index}`)
    const csv = ['item,alice,bob', ...labels.map((label, index) => `m${index},${label},${label}`)]
      .join('\n')

    expect(warnings(csv, wide([1, 2]))).toEqual([{ kind: 'many-labels', labels: 21 }])
  })

  test('exactly 20 distinct labels does not warn', () => {
    const labels = Array.from({ length: 20 }, (_, index) => `L${index}`)
    const csv = ['item,alice,bob', ...labels.map((label, index) => `m${index},${label},${label}`)]
      .join('\n')

    expect(warnings(csv, wide([1, 2]))).toEqual([])
  })

  test('more than 50,000 ratings warns but still maps', () => {
    // Counts non-missing ratings, in either shape: 25,001 items × 2 raters.
    const rows = Array.from({ length: 25_001 }, (_, index) => [`m${index}`, 'A', index ? 'A' : 'B'])
    const lineNumbers = rows.map((_, index) => index + 2)
    const raw: RawTable = { headers: ['item', 'alice', 'bob'], rows, lineNumbers }

    const mapped = mapDataset(raw, wide([1, 2]))

    expect(mapped.result.ok).toBe(true)
    expect(mapped.warnings).toEqual([{ kind: 'many-ratings', ratings: 50_002 }])
  })

  test('more than 50,000 ratings warns on a long file too', () => {
    const rows = Array.from({ length: 50_001 }, (_, index) => [
      `m${Math.floor(index / 2)}`,
      index % 2 ? 'bob' : 'alice',
      index ? 'A' : 'B',
    ])
    const lineNumbers = rows.map((_, index) => index + 2)
    const raw: RawTable = { headers: ['item', 'rater', 'label'], rows, lineNumbers }

    expect(mapDataset(raw, long()).warnings).toEqual([{ kind: 'many-ratings', ratings: 50_001 }])
  })

  test('exactly 50,000 ratings does not warn', () => {
    const rows = Array.from({ length: 25_000 }, (_, index) => [`m${index}`, 'A', index ? 'A' : 'B'])
    const lineNumbers = rows.map((_, index) => index + 2)
    const raw: RawTable = { headers: ['item', 'alice', 'bob'], rows, lineNumbers }

    expect(mapDataset(raw, wide([1, 2])).warnings).toEqual([])
  })

  test('conflicting text for one item warns and keeps the first', () => {
    const csv = [
      'item,rater,label,text',
      'm1,alice,A,first',
      'm1,bob,B, first ',
      'm1,carol,A,second',
      'm1,dave,A,third',
    ].join('\n')
    const mapping = long({ textColumn: 3 })

    expect(dataset(csv, mapping).items).toEqual([{ id: 'm1', text: 'first' }])
    expect(warnings(csv, mapping)).toEqual([
      {
        kind: 'conflicting-text',
        count: 2,
        examples: [
          { item: 'm1', line: 4, firstLine: 2 },
          { item: 'm1', line: 5, firstLine: 2 },
        ],
      },
    ])
  })

  test('more than 30 raters is not a warning', () => {
    const headers = ['item', ...Array.from({ length: 31 }, (_, index) => `r${index}`)]
    const cells = headers.slice(1).map((_, index) => (index % 2 ? 'A' : 'B'))
    const csv = [headers.join(','), ['m1', ...cells].join(',')].join('\n')
    const mapped = mapDataset(table(csv), wide(headers.slice(1).map((_, index) => index + 1)))

    expect(mapped.result.ok).toBe(true)
    expect(mapped.warnings).toEqual([])
  })

  test('a header-only file blocks', () => {
    expect(blocking('item,rater,label', long())).toEqual([
      { kind: 'too-few-raters', raters: 0 },
      { kind: 'too-few-labels', labels: [] },
      { kind: 'no-pairable-item' },
    ])
  })

  test('returns warnings alongside blocking errors', () => {
    const csv = 'item,rater,label,text\nm1,alice,A,one\nm1,alice,B,two'

    const mapped = mapDataset(table(csv), long({ textColumn: 3 }))

    expect(mapped.result).toEqual({
      ok: false,
      error: expect.arrayContaining([expect.objectContaining({ kind: 'duplicate-rating' })]),
    })
    expect(mapped.warnings).toEqual([
      expect.objectContaining({ kind: 'conflicting-text', count: 1 }),
    ])
  })
})
