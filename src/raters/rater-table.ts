import { outlierMessage, type RaterOutlier } from '../analysis/rater-outliers'
import type { Dataset } from '../dataset/dataset'
import { decimal } from '../format/number'
import { absentReading, meanKappaReading, pairsWith, type Reading } from '../format/result-words'
import type { MetricResult } from '../metrics/metric-result'

// A table cell's result: its value, a word beside it (a band, or why there is
// no value), and for a result without a value the reason in full.
export type ResultCell = { value: string; word: string; why: string | null }

// One rater in the Raters tab's table.
export type RaterRow = {
  // The rater's index in `dataset.raters`, a stable key.
  rater: number
  name: string
  meanKappa: ResultCell
  leaveOneOut: ResultCell
  // Leave-one-out α less α, signed ("+0.071"); null unless both are values.
  change: string | null
  // "α would be 0.710 without R3" for an outlier rater, else null.
  flag: string | null
}

const NEEDS_THREE: ResultCell = {
  value: 'N/A',
  word: 'needs 3 raters',
  why: 'leave-one-out α needs at least 3 raters with ratings',
}

// The rater table (SPEC.md, "Rater outliers"): per rater, mean κ against the
// others, leave-one-out α and how far it moves α, and the outlier flag.
// Flagged raters come first, so the outlier is the first thing read; the rest
// keep rater order.
export function raterRows(
  dataset: Dataset,
  outliers: readonly RaterOutlier[],
  full: MetricResult,
): RaterRow[] {
  const rows = outliers.map(({ rater, meanKappa, leaveOneOutAlpha, flagged }): RaterRow => {
    const name = dataset.raters[rater] ?? ''
    const bothValues = full.kind === 'value' && leaveOneOutAlpha?.kind === 'value'
    return {
      rater,
      name,
      meanKappa: cell(meanKappaReading(meanKappa, pairsWith(name)), meanKappa),
      leaveOneOut: leaveOneOutCell(leaveOneOutAlpha),
      change: bothValues ? signedDecimal(leaveOneOutAlpha.value - full.value) : null,
      flag:
        flagged && leaveOneOutAlpha?.kind === 'value'
          ? outlierMessage(name, leaveOneOutAlpha.value)
          : null,
    }
  })
  return [...rows.filter(({ flag }) => flag !== null), ...rows.filter(({ flag }) => flag === null)]
}

// The line over the table: who is flagged, or why nobody is.
export function raterTableSummary(rows: readonly RaterRow[]): string {
  const flagged = rows.filter(({ flag }) => flag !== null).length
  if (flagged > 0) {
    return (
      `Leaving ${flagged === 1 ? 'the flagged rater' : 'a flagged rater'} out raises α by ` +
      '0.05 or more, so their labels are worth a second look.'
    )
  }
  if (rows.every(({ leaveOneOut }) => leaveOneOut === NEEDS_THREE)) {
    return 'Leave-one-out α needs at least 3 raters with ratings, so no rater is flagged.'
  }
  if (rows.every(({ change }) => change === null)) {
    return 'α has no value to compare against, so no rater is flagged.'
  }
  return 'No rater is an outlier: leaving any one out raises α by less than 0.05.'
}

function leaveOneOutCell(result: MetricResult | null): ResultCell {
  if (result === null) return NEEDS_THREE
  if (result.kind === 'value') return { value: decimal(result.value), word: '', why: null }
  return cell(absentReading(result, 'no item keeps two ratings without this rater'), result)
}

function cell(reading: Reading, result: MetricResult): ResultCell {
  return {
    value: reading.value,
    word: reading.verdict.word,
    why: result.kind === 'value' ? null : reading.note,
  }
}

// A change in α or κ to 3 decimals, with a plus on a rise so it reads as one.
export function signedDecimal(value: number): string {
  const text = decimal(value)
  return Number(text) > 0 ? `+${text}` : text
}
