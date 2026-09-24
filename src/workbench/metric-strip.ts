import { type AlphaBand, alphaBand, kappaBand } from '../analysis/bands'
import type { Dataset, Level } from '../dataset/dataset'
import { counted, decimal, formatNumber, percent } from '../format/number'
import {
  ALL_PAIRS,
  ALPHA_BANDS,
  absentReading,
  KAPPA_BANDS,
  meanKappaReading,
  type Reading,
  type Tone,
} from '../format/result-words'
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

// One tile of the metric strip, in words: what the component renders.
export type MetricTile = { name: string; qualifier: string | null } & Reading

const ALPHA_TONES: Record<AlphaBand, Tone> = {
  reliable: 'good',
  tentative: 'warn',
  unreliable: 'critical',
}

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
  return { ...tile, ...absentReading(result, 'no item has two ratings') }
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
      return { ...tile, ...absentReading(result, 'no item has every rater’s label') }
  }
}

function kappaTile(result: MetricResult, weighting: Weighting): MetricTile {
  const tile = { name: "Mean pairwise Cohen's κ", qualifier: weightingName(weighting) }
  return { ...tile, ...meanKappaReading(result, ALL_PAIRS) }
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
  return { ...tile, ...absentReading(result, 'no item has two ratings') }
}
