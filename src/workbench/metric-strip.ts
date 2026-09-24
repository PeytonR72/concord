import {
  ALPHA_BAND_SOURCE,
  type AlphaBand,
  alphaBand,
  KAPPA_BAND_SOURCE,
  kappaBand,
} from '../analysis/bands'
import type { Dataset, Level } from '../dataset/dataset'
import { counted, decimal, formatNumber, percent } from '../format/number'
import { alpha } from '../metrics/alpha'
import {
  defaultWeighting,
  meanPairwiseKappa,
  type Weighting,
  weightingName,
} from '../metrics/cohen'
import { fleissKappa } from '../metrics/fleiss'
import type { MetricResult } from '../metrics/metric-result'
import { percentAgreement } from '../metrics/percent-agreement'

// A verdict's colour: α's bands take a status tone (always beside the word);
// κ's bands, notes and kinds are plain ink.
export type Tone = 'good' | 'warn' | 'critical' | 'plain'

// One tile of the metric strip, in words: what the component renders.
export type MetricTile = {
  name: string
  // The level or weighting it was computed at, when that needs saying.
  qualifier: string | null
  // The value as the strip prints it, or "N/A" for a result without one.
  value: string
  // The band, or a note or the result's kind in its place.
  verdict: { word: string; tone: Tone }
  // What n counted, or why there is no value.
  note: string
  // The tooltip: the band's source, or what the metric or its absence means.
  explanation: string
}

const ALPHA_TONES: Record<AlphaBand, Tone> = {
  reliable: 'good',
  tentative: 'warn',
  unreliable: 'critical',
}

const ALPHA_BANDS =
  `Bands after ${ALPHA_BAND_SOURCE}: 0.800 and up reliable, 0.667 to 0.800 tentative, ` +
  'below 0.667 unreliable. Bands are conventions, not tests of significance.'

const KAPPA_BANDS =
  `Bands after ${KAPPA_BAND_SOURCE}: below 0 poor, up to 0.20 slight, 0.40 fair, ` +
  '0.60 moderate, 0.80 substantial, above that almost perfect. Bands are conventions, ' +
  'not tests of significance.'

const NO_VARIATION =
  'Every rating is one category, so agreement by chance is total and the ' +
  'chance-corrected score is 0 divided by 0.'

const NO_PAIRS = 'No item has ratings from two raters, so there is nothing to compare.'

// The strip's four headline metrics (SPEC.md, "Metric strip"), in order: α,
// Fleiss' κ, mean pairwise Cohen's κ and percent agreement.
export function metricTiles(dataset: Dataset): MetricTile[] {
  const items = dataset.items.length
  const weighting = defaultWeighting(dataset.level)
  return [
    alphaTile(alpha(dataset), dataset.level),
    fleissTile(fleissKappa(dataset), items, dataset.level === 'ordinal'),
    kappaTile(meanPairwiseKappa(dataset, weighting), weighting),
    agreementTile(percentAgreement(dataset)),
  ]
}

// The line under the strip: "200 items · 5 raters · 4 categories · nominal".
export function datasetCounts(dataset: Dataset): string {
  return [
    counted(dataset.items.length, 'item'),
    counted(dataset.raters.length, 'rater'),
    counted(dataset.categories.length, 'category', 'categories'),
    dataset.level,
  ].join(' · ')
}

function alphaTile(result: MetricResult, level: Level): MetricTile {
  const tile = { name: "Krippendorff's α", qualifier: level }
  if (result.kind === 'value') {
    const band = alphaBand(result)
    return {
      ...tile,
      value: decimal(result.value),
      verdict:
        band === null ? { word: '', tone: 'plain' } : { word: band, tone: ALPHA_TONES[band] },
      note: `n = ${counted(result.n, 'pairable value')}`,
      explanation: ALPHA_BANDS,
    }
  }
  return { ...tile, ...absent(result, 'no item has two ratings') }
}

function fleissTile(result: MetricResult, items: number, ordinal: boolean): MetricTile {
  // Fleiss' κ is always nominal, which needs saying only on ordinal data.
  const tile = { name: "Fleiss' κ", qualifier: ordinal ? 'nominal' : null }
  switch (result.kind) {
    case 'value':
      return {
        ...tile,
        value: decimal(result.value),
        verdict: { word: kappaBand(result) ?? '', tone: 'plain' },
        note: `computed on ${formatNumber(result.n)} of ${counted(items, 'item')}`,
        explanation: KAPPA_BANDS,
      }
    case 'too-few-items':
      return {
        ...tile,
        value: 'N/A',
        verdict: { word: 'use α instead', tone: 'plain' },
        note:
          `only ${formatNumber(result.n)} of ${counted(items, 'item')} ` +
          `${result.n === 1 ? 'is' : 'are'} complete (needs ${result.minimum})`,
        explanation:
          `Fleiss' κ uses only the items every rater labelled, and needs ${result.minimum} ` +
          "of them. Krippendorff's α uses every item with two or more ratings, so read α " +
          'instead.',
      }
    default:
      return { ...tile, ...absent(result, 'no item has every rater’s label') }
  }
}

function kappaTile(result: MetricResult, weighting: Weighting): MetricTile {
  const tile = { name: "Mean pairwise Cohen's κ", qualifier: weightingName(weighting) }
  switch (result.kind) {
    case 'value':
      return {
        ...tile,
        value: decimal(result.value),
        verdict: { word: kappaBand(result) ?? '', tone: 'plain' },
        note: `over ${counted(result.n, 'rater pair')}`,
        explanation: KAPPA_BANDS,
      }
    // Per pair: the pairs sharing enough items each used one category, though
    // the dataset as a whole may vary.
    case 'no-variation':
      return {
        ...tile,
        value: 'N/A',
        verdict: { word: 'no variation', tone: 'plain' },
        note: 'every rater pair sharing enough items used one category',
        explanation:
          'Each pair of raters sharing enough items used one category between them, so ' +
          "every pair's chance-corrected score is 0 divided by 0.",
      }
    case 'too-few-items':
      return {
        ...tile,
        value: 'N/A',
        verdict: { word: 'too few shared items', tone: 'plain' },
        note: `no rater pair shares ${result.minimum} items (most: ${formatNumber(result.n)})`,
        explanation:
          `Cohen's κ is reported for a pair of raters only when they share at least ` +
          `${result.minimum} items, and no pair does.`,
      }
    default:
      return { ...tile, ...absent(result, 'no two raters share an item') }
  }
}

function agreementTile(result: MetricResult): MetricTile {
  const tile = { name: 'Percent agreement', qualifier: null }
  if (result.kind === 'value') {
    return {
      ...tile,
      value: percent(result.value),
      verdict: { word: 'ignores chance', tone: 'plain' },
      note: `n = ${counted(result.n, 'pairable item')}`,
      explanation:
        'The share of rater pairs that agree, averaged over items with two or more ratings. ' +
        'It ignores agreement by chance, so it reads higher than α and κ.',
    }
  }
  return { ...tile, ...absent(result, 'no item has two ratings') }
}

// The parts of a tile for no variation or no pairable values; `nothing` says
// what's missing. Too few items is worded by the κ tiles, the only metrics
// that return it.
function absent(
  result: MetricResult,
  nothing: string,
): Pick<MetricTile, 'value' | 'verdict' | 'note' | 'explanation'> {
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
