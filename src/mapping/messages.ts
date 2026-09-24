import { type Blocking, EXAMPLE_LIMIT, type Warning } from '../ingest/guardrails'
import type { Shape } from '../ingest/mapping'
import { counted, formatNumber } from '../format/number'

// A guardrail in words: a sentence that says what is wrong and how to fix it,
// then any example rows, and how many rows the examples leave out.
export type GuardrailMessage = { text: string; examples: readonly string[]; more: number }

// What a message needs beyond the guardrail: headers to name columns, and the
// shape, since the fix points at different controls for each.
export type MessageContext = { headers: readonly string[]; shape: Shape }

// Every Blocking and Warning kind has a message (SPEC.md, "Guardrails").
export function guardrailMessage(
  guardrail: Blocking | Warning,
  { headers, shape }: MessageContext,
): GuardrailMessage {
  switch (guardrail.kind) {
    case 'column-out-of-range':
      return plain(
        `The mapping points at column ${guardrail.column + 1}, but the file has ` +
          `${counted(headers.length, 'column')}. Choose the columns again.`,
      )

    case 'column-reused':
      return plain(
        `${columnName(headers, guardrail.column)} is mapped to more than one role. ` +
          'Give each role its own column.',
      )

    case 'category-repeated':
      return plain(
        `${quote(guardrail.category)} appears more than once in the category order. ` +
          'Each category takes one place.',
      )

    case 'empty-item-id':
      return plain(
        `${rowLines(guardrail.count, guardrail.lines, 'no item id')} ` +
          'Fill in the ids, or remove those rows.',
      )

    case 'empty-rater':
      return plain(
        `${rowLines(guardrail.count, guardrail.lines, 'no rater')} ` +
          'Fill in the raters, or remove those rows.',
      )

    case 'duplicate-rating':
      return withExamples(
        `${rowsDo(guardrail.count, 'repeat')} an item and rater from an earlier row. Each rater ` +
          'rates an item once: remove the extra rows, or check the item and rater columns.',
        guardrail.count,
        guardrail.examples.map(
          ({ item, rater, line, firstLine }) =>
            `${item} by ${rater}: line ${line} repeats line ${firstLine}`,
        ),
      )

    case 'duplicate-item':
      return withExamples(
        `${rowsDo(guardrail.count, 'repeat')} an item id from an earlier row. ` +
          'A wide file has one row per item: merge the rows, or check the item column. ' +
          'If each row is one rating, the file is long.',
        guardrail.count,
        guardrail.examples.map(
          ({ item, line, firstLine }) => `${item}: line ${line} repeats line ${firstLine}`,
        ),
      )

    case 'unordered-labels':
      return plain(
        `The category order leaves out ${quotedList(guardrail.labels)}. ` +
          'Place every label in the order.',
      )

    case 'too-few-raters':
      return plain(
        `${guardrail.raters === 0 ? 'No rater has a rating' : 'Only one rater has ratings'}. ` +
          'Agreement needs at least 2 raters: ' +
          (shape === 'long' ? 'check the rater column.' : 'tick at least 2 rater columns.'),
      )

    case 'too-few-labels': {
      const [only] = guardrail.labels
      const check = shape === 'long' ? 'the label column' : 'the rater columns'
      return plain(
        only === undefined
          ? 'No rating has a label: every cell is empty or a missing token (NA, N/A, null). ' +
              `Check ${check}.`
          : `Every rating is ${quote(only)}. Agreement needs at least 2 different labels: ` +
              `check ${check}.`,
      )
    }

    case 'no-pairable-item':
      return plain(
        'No item has ratings from 2 raters, so there is nothing to compare. ' +
          (shape === 'long'
            ? 'Check the item column: each item needs a row per rater.'
            : 'Check the rater columns.'),
      )

    case 'many-labels':
      return plain(
        `${formatNumber(guardrail.labels)} distinct labels. Is a text or id column ` +
          (shape === 'long' ? 'mapped as the label?' : 'ticked as a rater?'),
      )

    case 'many-ratings':
      return plain(
        `${formatNumber(guardrail.ratings)} ratings. Concord will still try, but the ` +
          'workbench may be slow.',
      )

    case 'conflicting-text':
      return withExamples(
        `${rowsDo(guardrail.count, 'give')} an item different text from an earlier row. ` +
          'The first text is kept.',
        guardrail.count,
        guardrail.examples.map(
          ({ item, line, firstLine }) => `${item}: line ${line} differs from line ${firstLine}`,
        ),
      )
  }
}

function plain(text: string): GuardrailMessage {
  return { text, examples: [], more: 0 }
}

function withExamples(text: string, count: number, examples: readonly string[]): GuardrailMessage {
  return { text, examples, more: Math.max(0, count - examples.length) }
}

// "Line 4 has …", "Lines 4 and 9 have …", or "12 rows have …: lines 4, 9 and 10 more."
function rowLines(count: number, lines: readonly number[], what: string): string {
  const listed = lines.map((line) => formatNumber(line))
  if (count === 1 && listed.length === 1) return `Line ${listed.join('')} has ${what}.`
  if (count <= listed.length) return `Lines ${joined(listed)} have ${what}.`
  const more = `${formatNumber(count - listed.length)} more`
  return `${formatNumber(count)} rows have ${what}: lines ${joined([...listed, more])}.`
}

// "A row repeats", "7 rows repeat".
function rowsDo(count: number, verb: string): string {
  return count === 1 ? `A row ${verb}s` : `${counted(count, 'row')} ${verb}`
}

// A column as the mapping screen lists it: its header, or its place when blank.
export function columnLabel(headers: readonly string[], column: number): string {
  const header = headers[column] ?? ''
  return header === '' ? `Column ${column + 1}` : header
}

// columnLabel in a sentence: a header is quoted, a blank one named by place.
function columnName(headers: readonly string[], column: number): string {
  const label = columnLabel(headers, column)
  return headers[column] ? `The column ${quote(label)}` : label
}

// Up to EXAMPLE_LIMIT quoted values, then how many more.
function quotedList(values: readonly string[]): string {
  const shown = values.slice(0, EXAMPLE_LIMIT).map(quote)
  const rest = values.length - shown.length
  return joined(rest > 0 ? [...shown, `${formatNumber(rest)} more`] : shown)
}

function quote(value: string): string {
  return `“${value}”`
}

// "a", "a and b", "a, b and c".
function joined(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1) ?? ''}`
}
