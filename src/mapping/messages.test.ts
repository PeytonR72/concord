import { describe, expect, test } from 'vitest'
import { columnLabel, guardrailMessage, type MessageContext } from './messages'

const long: MessageContext = { headers: ['item', 'rater', 'label', ''], shape: 'long' }
const wide: MessageContext = { headers: ['item', 'alice', 'bob'], shape: 'wide' }

describe('guardrailMessage: the mapping', () => {
  test('column-out-of-range', () => {
    expect(guardrailMessage({ kind: 'column-out-of-range', column: 6 }, long)).toEqual({
      text: 'The mapping points at column 7, but the file has 4 columns. Choose the columns again.',
      examples: [],
      more: 0,
    })
  })

  test('column-reused names the column by its header, or by its place when blank', () => {
    expect(guardrailMessage({ kind: 'column-reused', column: 2 }, long).text).toBe(
      'The column “label” is mapped to more than one role. Give each role its own column.',
    )
    expect(guardrailMessage({ kind: 'column-reused', column: 3 }, long).text).toBe(
      'Column 4 is mapped to more than one role. Give each role its own column.',
    )
  })

  test('category-repeated', () => {
    expect(guardrailMessage({ kind: 'category-repeated', category: 'High' }, long).text).toBe(
      '“High” appears more than once in the category order. Each category takes one place.',
    )
  })
})

describe('guardrailMessage: rows', () => {
  test('empty-item-id on one row', () => {
    expect(guardrailMessage({ kind: 'empty-item-id', count: 1, lines: [4] }, long).text).toBe(
      'Line 4 has no item id. Fill in the ids, or remove those rows.',
    )
  })

  test('empty-item-id lists every line when they fit', () => {
    expect(
      guardrailMessage({ kind: 'empty-item-id', count: 3, lines: [4, 9, 12] }, wide).text,
    ).toBe('Lines 4, 9 and 12 have no item id. Fill in the ids, or remove those rows.')
  })

  test('empty-rater counts the lines it leaves out', () => {
    expect(
      guardrailMessage({ kind: 'empty-rater', count: 1204, lines: [2, 3, 4, 5, 6] }, long).text,
    ).toBe(
      '1,204 rows have no rater: lines 2, 3, 4, 5, 6 and 1,199 more. ' +
        'Fill in the raters, or remove those rows.',
    )
  })

  test('duplicate-rating lists its examples and how many more there are', () => {
    expect(
      guardrailMessage(
        {
          kind: 'duplicate-rating',
          count: 7,
          examples: [
            { item: 'm1', rater: 'alice', line: 12, firstLine: 3 },
            { item: 'm2', rater: 'bob', line: 14, firstLine: 5 },
          ],
        },
        long,
      ),
    ).toEqual({
      text:
        '7 rows repeat an item and rater from an earlier row. Each rater rates an item once: ' +
        'remove the extra rows, or check the item and rater columns.',
      examples: ['m1 by alice: line 12 repeats line 3', 'm2 by bob: line 14 repeats line 5'],
      more: 5,
    })
  })

  test('duplicate-rating on one row', () => {
    expect(
      guardrailMessage(
        {
          kind: 'duplicate-rating',
          count: 1,
          examples: [{ item: 'm1', rater: 'alice', line: 12, firstLine: 3 }],
        },
        long,
      ).text,
    ).toMatch(/^A row repeats an item and rater from an earlier row\./)
  })

  test('duplicate-item', () => {
    expect(
      guardrailMessage(
        { kind: 'duplicate-item', count: 1, examples: [{ item: 'm1', line: 9, firstLine: 2 }] },
        wide,
      ),
    ).toEqual({
      text:
        'A row repeats an item id from an earlier row. A wide file has one row per item: ' +
        'merge the rows, or check the item column. If each row is one rating, the file is long.',
      examples: ['m1: line 9 repeats line 2'],
      more: 0,
    })
  })
})

describe('guardrailMessage: labels and raters', () => {
  test('unordered-labels quotes the labels', () => {
    const labels = ['Low', 'High']
    expect(guardrailMessage({ kind: 'unordered-labels', labels }, long).text).toBe(
      'The category order leaves out “Low” and “High”. Place every label in the order.',
    )
  })

  test('unordered-labels shortens a long list', () => {
    const labels = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    expect(guardrailMessage({ kind: 'unordered-labels', labels }, long).text).toBe(
      'The category order leaves out “a”, “b”, “c”, “d”, “e” and 2 more. ' +
        'Place every label in the order.',
    )
  })

  test('too-few-raters, by shape', () => {
    expect(guardrailMessage({ kind: 'too-few-raters', raters: 0 }, long).text).toBe(
      'No rater has a rating. Agreement needs at least 2 raters: check the rater column.',
    )
    expect(guardrailMessage({ kind: 'too-few-raters', raters: 1 }, wide).text).toBe(
      'Only one rater has ratings. Agreement needs at least 2 raters: ' +
        'tick at least 2 rater columns.',
    )
  })

  test('too-few-labels with no labels at all', () => {
    expect(guardrailMessage({ kind: 'too-few-labels', labels: [] }, long).text).toBe(
      'No rating has a label: every cell is empty or a missing token (NA, N/A, null). ' +
        'Check the label column.',
    )
  })

  test('too-few-labels with one label', () => {
    expect(guardrailMessage({ kind: 'too-few-labels', labels: ['Yes'] }, wide).text).toBe(
      'Every rating is “Yes”. Agreement needs at least 2 different labels: ' +
        'check the rater columns.',
    )
  })

  test('no-pairable-item, by shape', () => {
    expect(guardrailMessage({ kind: 'no-pairable-item' }, long).text).toBe(
      'No item has ratings from 2 raters, so there is nothing to compare. ' +
        'Check the item column: each item needs a row per rater.',
    )
    expect(guardrailMessage({ kind: 'no-pairable-item' }, wide).text).toBe(
      'No item has ratings from 2 raters, so there is nothing to compare. ' +
        'Check the rater columns.',
    )
  })
})

describe('guardrailMessage: warnings', () => {
  test('many-labels, by shape', () => {
    expect(guardrailMessage({ kind: 'many-labels', labels: 23 }, long).text).toBe(
      '23 distinct labels. Is a text or id column mapped as the label?',
    )
    expect(guardrailMessage({ kind: 'many-labels', labels: 23 }, wide).text).toBe(
      '23 distinct labels. Is a text or id column ticked as a rater?',
    )
  })

  test('many-ratings', () => {
    expect(guardrailMessage({ kind: 'many-ratings', ratings: 52_340 }, long).text).toBe(
      '52,340 ratings. Concord will still try, but the workbench may be slow.',
    )
  })

  test('conflicting-text', () => {
    expect(
      guardrailMessage(
        {
          kind: 'conflicting-text',
          count: 2,
          examples: [
            { item: 'm1', line: 4, firstLine: 2 },
            { item: 'm1', line: 5, firstLine: 2 },
          ],
        },
        long,
      ),
    ).toEqual({
      text: '2 rows give an item different text from an earlier row. The first text is kept.',
      examples: ['m1: line 4 differs from line 2', 'm1: line 5 differs from line 2'],
      more: 0,
    })
  })
})

describe('columnLabel', () => {
  test('is the header, or the column number when the header is blank', () => {
    expect(columnLabel(long.headers, 2)).toBe('label')
    expect(columnLabel(long.headers, 3)).toBe('Column 4')
  })
})
