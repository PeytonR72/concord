import { describe, expect, test } from 'vitest'
import { parseCsv, readCsvFile } from './parse-csv'

describe('parseCsv', () => {
  test('reads the header row and records as strings', () => {
    expect(parseCsv('item,rater,label\nm001,alice,Negative\nm001,bob,1.0')).toEqual({
      ok: true,
      value: {
        headers: ['item', 'rater', 'label'],
        rows: [
          ['m001', 'alice', 'Negative'],
          ['m001', 'bob', '1.0'],
        ],
        lineNumbers: [2, 3],
      },
    })
  })

  test('keeps commas inside quoted fields', () => {
    const result = parseCsv('item,text\nm001,"Great, another outage."')

    expect(result).toEqual({
      ok: true,
      value: { headers: ['item', 'text'], rows: [['m001', 'Great, another outage.']], lineNumbers: [2] },
    })
  })

  test('strips a byte order mark from the first header', () => {
    const result = parseCsv('﻿item,rater,label\nm001,alice,Negative')

    expect(result.ok && result.value.headers).toEqual(['item', 'rater', 'label'])
  })

  test('skips blank trailing lines', () => {
    const result = parseCsv('item,label\nm001,Negative\n\n\n  \n')

    expect(result.ok && result.value.rows).toEqual([['m001', 'Negative']])
  })

  test('accepts CRLF line endings', () => {
    const result = parseCsv('item,label\r\nm001,Negative\r\n')

    expect(result).toEqual({
      ok: true,
      value: { headers: ['item', 'label'], rows: [['m001', 'Negative']], lineNumbers: [2] },
    })
  })

  test('trims whitespace around headers but not around cells', () => {
    const result = parseCsv(' item , label \nm001, Negative ')

    expect(result).toEqual({
      ok: true,
      value: { headers: ['item', 'label'], rows: [['m001', ' Negative ']], lineNumbers: [2] },
    })
  })

  test('keeps duplicate and blank headers so columns stay positional', () => {
    const result = parseCsv('item,,alice,alice\nm001,x,Negative,Positive')

    expect(result.ok && result.value.headers).toEqual(['item', '', 'alice', 'alice'])
  })

  test('pads a short row with empty cells', () => {
    const result = parseCsv('item,alice,bob\nm001,Negative')

    expect(result.ok && result.value.rows).toEqual([['m001', 'Negative', '']])
  })

  test('refuses a row with more cells than the header', () => {
    expect(parseCsv('item,label\nm001,Negative\nm002,Positive,extra')).toEqual({
      ok: false,
      error: 'Line 3 has 3 cells but the header has 2.',
    })
  })

  test('numbers rows by the line they start on, past blank lines and quoted line breaks', () => {
    const result = parseCsv('item,text\n\nm001,"Great,\nanother outage."\r\n  \nm002,Fine\n')

    expect(result.ok && result.value.lineNumbers).toEqual([3, 6])
  })

  test('counts blank lines in the line number of a refusal', () => {
    expect(parseCsv('item,label\n\nm001,Negative,extra')).toEqual({
      ok: false,
      error: 'Line 3 has 3 cells but the header has 2.',
    })
  })

  test('refuses an unterminated quote', () => {
    expect(parseCsv('item,text\nm001,"Great, another outage.')).toEqual({
      ok: false,
      error: 'Line 2 has a quoted field that never closes.',
    })
  })

  test('refuses an empty file', () => {
    expect(parseCsv('')).toEqual({ ok: false, error: 'The file is empty.' })
  })

  test('refuses a file of blank lines as empty', () => {
    expect(parseCsv('\n \r\n\n')).toEqual({ ok: false, error: 'The file is empty.' })
  })

  test('accepts a header-only file with no rows', () => {
    expect(parseCsv('item,rater,label\n')).toEqual({
      ok: true,
      value: { headers: ['item', 'rater', 'label'], rows: [], lineNumbers: [] },
    })
  })
})

describe('readCsvFile', () => {
  test('parses a File the same way as a string', async () => {
    const file = new File(['﻿item,label\r\nm001,Negative\r\n'], 'labels.csv', {
      type: 'text/csv',
    })

    expect(await readCsvFile(file)).toEqual({
      ok: true,
      value: { headers: ['item', 'label'], rows: [['m001', 'Negative']], lineNumbers: [2] },
    })
  })
})
