import { describe, expect, test } from 'vitest'
import { detectShape } from './detect-shape'

describe('detectShape: long', () => {
  test('proposes long for item, rater, label', () => {
    expect(detectShape(['item', 'rater', 'label'])).toEqual({
      shape: 'long',
      itemColumn: 0,
      raterColumn: 1,
      labelColumn: 2,
      level: 'nominal',
      categoryOrder: [],
    })
  })

  test('proposes a 4th column as text when it matches a text pattern', () => {
    expect(detectShape(['item', 'rater', 'label', 'text'])).toEqual({
      shape: 'long',
      itemColumn: 0,
      raterColumn: 1,
      labelColumn: 2,
      textColumn: 3,
      level: 'nominal',
      categoryOrder: [],
    })
  })

  test('stays long without a text column when the 4th column is not text-like', () => {
    const mapping = detectShape(['item', 'rater', 'label', 'batch'])

    expect(mapping.shape).toBe('long')
    expect(mapping).not.toHaveProperty('textColumn')
  })

  test('finds the columns in any order and ignores case', () => {
    expect(detectShape(['Message', 'CODER', 'Category', 'Unit'])).toEqual({
      shape: 'long',
      itemColumn: 3,
      raterColumn: 1,
      labelColumn: 2,
      textColumn: 0,
      level: 'nominal',
      categoryOrder: [],
    })
  })

  test.each(['item', 'id', 'unit', 'item_id'])('accepts %s as the item column', (header) => {
    expect(detectShape([header, 'rater', 'label'])).toMatchObject({
      shape: 'long',
      itemColumn: 0,
    })
  })

  test.each(['rater', 'annotator', 'coder', 'worker'])(
    'accepts %s as the rater column',
    (header) => {
      expect(detectShape(['item', header, 'label'])).toMatchObject({
        shape: 'long',
        raterColumn: 1,
      })
    },
  )

  test.each(['label', 'category', 'rating', 'annotation'])(
    'accepts %s as the label column',
    (header) => {
      expect(detectShape(['item', 'rater', header])).toMatchObject({
        shape: 'long',
        labelColumn: 2,
      })
    },
  )

  test.each(['text', 'content', 'message', 'sentence'])(
    'accepts %s as the text column',
    (header) => {
      expect(detectShape(['item', 'rater', 'label', header])).toMatchObject({
        shape: 'long',
        textColumn: 3,
      })
    },
  )

  test('matches whole headers, not substrings', () => {
    expect(detectShape(['item', 'rater_name', 'label']).shape).toBe('wide')
  })
})

describe('detectShape: wide', () => {
  test('proposes wide: first column is the item, the rest are raters', () => {
    expect(detectShape(['item', 'alice', 'bob', 'carol'])).toEqual({
      shape: 'wide',
      itemColumn: 0,
      raterColumns: [1, 2, 3],
      level: 'nominal',
      categoryOrder: [],
    })
  })

  test('takes a text-like column out of the raters', () => {
    expect(detectShape(['item', 'text', 'alice', 'bob', 'carol'])).toEqual({
      shape: 'wide',
      itemColumn: 0,
      raterColumns: [2, 3, 4],
      textColumn: 1,
      level: 'nominal',
      categoryOrder: [],
    })
  })

  test('falls back to wide at 5 columns even when the long headers are present', () => {
    expect(detectShape(['item', 'rater', 'label', 'text', 'batch'])).toEqual({
      shape: 'wide',
      itemColumn: 0,
      raterColumns: [1, 2, 4],
      textColumn: 3,
      level: 'nominal',
      categoryOrder: [],
    })
  })

  test('falls back to wide when a long header is missing', () => {
    expect(detectShape(['item', 'rater', 'score']).shape).toBe('wide')
  })

  test('uses the first column as the item even if it is text-like', () => {
    expect(detectShape(['message', 'alice', 'bob'])).toEqual({
      shape: 'wide',
      itemColumn: 0,
      raterColumns: [1, 2],
      level: 'nominal',
      categoryOrder: [],
    })
  })

  test('proposes no raters for a single-column file', () => {
    expect(detectShape(['item'])).toEqual({
      shape: 'wide',
      itemColumn: 0,
      raterColumns: [],
      level: 'nominal',
      categoryOrder: [],
    })
  })
})
