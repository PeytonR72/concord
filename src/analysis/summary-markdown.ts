import type { Dataset } from '../dataset/dataset'
import { counted, decimal, formatNumber, pairings as pairingsText, percent } from '../format/number'
import { alpha } from '../metrics/alpha'
import { coincidenceMatrix } from '../metrics/coincidence'
import {
  defaultWeighting,
  meanPairwiseKappa,
  weightingName,
  type Weighting,
} from '../metrics/cohen'
import { fleissKappa } from '../metrics/fleiss'
import type { MetricResult } from '../metrics/metric-result'
import { percentAgreement } from '../metrics/percent-agreement'
import { alphaBand, kappaBand } from './bands'
import { confusionName, confusionShares } from './confusion-shares'
import { raterOutliers } from './rater-outliers'

// The confusions the summary lists.
const TOP_CONFUSIONS = 3

// The Copy summary button's Markdown (SPEC.md, "Summary Markdown"): the
// headline metrics with bands and n, dataset counts and level, the top
// confusions with shares, flagged raters, and a footer. α and κ show 3
// decimals; percent agreement and shares whole percents.
export function summaryMarkdown(dataset: Dataset): string {
  const weighting = defaultWeighting(dataset.level)
  const items = dataset.items.length
  const lines = [
    '## Concord agreement summary',
    '',
    metricLine(`Krippendorff's α (${dataset.level})`, alpha(dataset), {
      format: decimal,
      verdict: alphaBand,
      context: (n) => `n = ${counted(n, 'pairable value')}`,
    }),
    metricLine("Fleiss' κ (nominal)", fleissKappa(dataset), {
      format: decimal,
      verdict: kappaBand,
      context: (n) => `computed on ${formatNumber(n)} of ${counted(items, 'item')}`,
    }),
    metricLine(
      `Mean pairwise Cohen's κ (${weightingName(weighting)})`,
      meanPairwiseKappa(dataset, weighting),
      { format: decimal, verdict: kappaBand, context: (n) => counted(n, 'rater pair') },
    ),
    metricLine('Percent agreement', percentAgreement(dataset), {
      format: percent,
      verdict: () => 'ignores chance',
      context: (n) => `n = ${counted(n, 'item')}`,
    }),
    '',
    `**Dataset:** ${counted(items, 'item')}, ${counted(dataset.raters.length, 'rater')}, ` +
      `${counted(dataset.categories.length, 'category', 'categories')}, ${dataset.level}.`,
    '',
    '### Top confusions',
    '',
    ...confusionLines(dataset),
    '',
    '### Flagged raters',
    '',
    ...flaggedLines(dataset, weighting),
    '',
    '---',
    '',
    'Computed in Concord (in the browser; the file never left the tab).',
    '',
  ]
  return lines.join('\n')
}

type Presentation = {
  format: (value: number) => string
  // The band, or a note in its place; null for none.
  verdict: (result: MetricResult) => string | null
  // What n counted, said in words.
  context: (n: number) => string
}

function metricLine(name: string, result: MetricResult, presentation: Presentation): string {
  return `- **${name}:** ${describe(result, presentation)}`
}

function describe(result: MetricResult, { format, verdict, context }: Presentation): string {
  switch (result.kind) {
    case 'value': {
      const note = verdict(result)
      return `${format(result.value)}${note === null ? '' : `, ${note}`} (${context(result.n)})`
    }
    case 'no-variation':
      return `no variation (${context(result.n)})`
    case 'too-few-items':
      return `too few items (${formatNumber(result.n)} of ${result.minimum})`
    case 'no-pairable-values':
      return 'no pairable values'
  }
}

function confusionLines(dataset: Dataset): string[] {
  const shares = confusionShares(coincidenceMatrix(dataset)).slice(0, TOP_CONFUSIONS)
  if (shares.length === 0) return ['None: the raters never disagree.']
  const categories = dataset.categories.map(escapeMarkdown)
  return shares.map(({ a, b, pairings, share }, index) => {
    const pair = confusionName(categories, { a, b })
    const count = `${pairingsText(pairings)} pairings`
    return `${index + 1}. ${pair}: ${count} (${percent(share)} of all disagreement)`
  })
}

function flaggedLines(dataset: Dataset, weighting: Weighting): string[] {
  const outliers = raterOutliers(dataset, weighting)
  if (outliers.every(({ leaveOneOutAlpha }) => leaveOneOutAlpha === null)) {
    return ['None: leave-one-out α needs at least 3 raters.']
  }
  const flagged = outliers.flatMap(({ rater, leaveOneOutAlpha, flagged }) => {
    if (!flagged || leaveOneOutAlpha?.kind !== 'value') return []
    const name = escapeMarkdown(dataset.raters[rater] ?? '')
    return [`- ${name}: α would be ${decimal(leaveOneOutAlpha.value)} without ${name}`]
  })
  return flagged.length === 0 ? ['None.'] : flagged
}

// Rater and category names are the user's text: characters Markdown would
// read as formatting (GFM's ~ and | included) are escaped so a name like
// `snake_case` survives.
function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_~|[\]<>]/g, '\\$&')
}

