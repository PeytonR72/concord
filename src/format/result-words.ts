import { ALPHA_BAND_SOURCE, KAPPA_BAND_SOURCE, kappaBand } from '../analysis/bands'
import type { MetricResult } from '../metrics/metric-result'
import { counted, decimal, formatNumber } from './number'

// Metric results in words, shared by the metric strip and the Raters tab, so
// a result reads the same wherever it shows.

// A verdict's colour: α's bands take a status tone (always beside the word);
// κ's bands, notes and kinds are plain ink.
export type Tone = 'good' | 'warn' | 'critical' | 'plain'

// A result in words, without the metric's name: what a tile or a table cell
// prints for it.
export type Reading = {
  // The value as printed, or "N/A" for a result without one.
  value: string
  // The band, or a note or the result's kind in its place.
  verdict: { word: string; tone: Tone }
  // What n counted, or why there is no value.
  note: string
  // The tooltip: the band's source, or what the metric or its absence means.
  explanation: string
}

// Whose rater pairs a mean κ averages, as its notes name them: the dataset's
// (the strip), or one rater's against the others (the Raters tab).
export type PairScope = {
  one: string
  many: string
  // What's missing when there is nothing pairable.
  none: string
}

export const ALL_PAIRS: PairScope = {
  one: 'rater pair',
  many: 'rater pairs',
  none: 'no two raters share an item',
}

export function pairsWith(rater: string): PairScope {
  return {
    one: `pair with ${rater}`,
    many: `pairs with ${rater}`,
    none: `${rater} shares no item with another rater`,
  }
}

export const ALPHA_BANDS =
  `Bands after ${ALPHA_BAND_SOURCE}: 0.800 and up reliable, 0.667 to 0.800 tentative, ` +
  'below 0.667 unreliable. Bands are conventions, not tests of significance.'

export const KAPPA_BANDS =
  `Bands after ${KAPPA_BAND_SOURCE}: below 0 poor, up to 0.20 slight, 0.40 fair, ` +
  '0.60 moderate, 0.80 substantial, above that almost perfect. Bands are conventions, ' +
  'not tests of significance.'

export const NO_VARIATION =
  'Every rating is one category, so agreement by chance is total and the ' +
  'chance-corrected score is 0 divided by 0.'

export const NO_PAIRS = 'No item has ratings from two raters, so there is nothing to compare.'

// A mean κ over some rater pairs (SPEC.md, "Mean pairwise κ"): the strip's
// over every pair, or the Raters tab's over one rater's.
export function meanKappaReading(result: MetricResult, scope: PairScope): Reading {
  switch (result.kind) {
    case 'value':
      return {
        value: decimal(result.value),
        verdict: { word: kappaBand(result) ?? '', tone: 'plain' },
        note: `over ${counted(result.n, scope.one, scope.many)}`,
        explanation: KAPPA_BANDS,
      }
    // Per pair: the pairs sharing enough items each used one category, though
    // the dataset as a whole may vary.
    case 'no-variation':
      return {
        value: 'N/A',
        verdict: { word: 'no variation', tone: 'plain' },
        note: `every ${scope.one} sharing enough items used one category`,
        explanation:
          'Each pair of raters sharing enough items used one category between them, so ' +
          "every pair's chance-corrected score is 0 divided by 0.",
      }
    case 'too-few-items':
      return {
        value: 'N/A',
        verdict: { word: 'too few shared items', tone: 'plain' },
        note: `no ${scope.one} shares ${result.minimum} items (most: ${formatNumber(result.n)})`,
        explanation:
          `Cohen's κ is reported for a pair of raters only when they share at least ` +
          `${result.minimum} items, and no pair does.`,
      }
    default:
      return absentReading(result, scope.none)
  }
}

// A result without a value that is no variation or no pairable values;
// `nothing` says what's missing. Too few items is worded by the κ readings,
// since only the κs return it.
export function absentReading(result: MetricResult, nothing: string): Reading {
  if (result.kind === 'no-variation') {
    return {
      value: 'N/A',
      verdict: { word: 'no variation', tone: 'plain' },
      note: 'every rating is one category',
      explanation: NO_VARIATION,
    }
  }
  return {
    value: 'N/A',
    verdict: { word: 'no pairable values', tone: 'plain' },
    note: nothing,
    explanation: NO_PAIRS,
  }
}

// One pair's κ in words: what a cell or table row prints, and beside or
// behind it the band, or why there is no value.
export type PairReading = { printed: string; words: string }

export function pairReading(result: MetricResult): PairReading {
  switch (result.kind) {
    case 'value':
      return { printed: decimal(result.value), words: kappaBand(result) ?? '' }
    case 'too-few-items':
      return {
        printed: 'N/A',
        words: `too few shared items (${result.n} of ${result.minimum})`,
      }
    case 'no-variation':
      return {
        printed: 'N/A',
        words: `no variation: all ${counted(result.n, 'shared item')} are one category`,
      }
    case 'no-pairable-values':
      return { printed: 'N/A', words: 'no shared items' }
  }
}
