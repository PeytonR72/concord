import type { Hotspot } from '../analysis/hotspots'
import type { Dataset } from '../dataset/dataset'
import { meanDistance, percent } from '../format/number'
import { distributionSegments, type Segment } from './distribution'

// One item in the Items tab's hotspot list.
export type HotspotRow = {
  // The item's index in `dataset.items`, a stable key.
  item: number
  // 1 for the most disagreed-on item.
  rank: number
  id: string
  text: string | null
  // How much its raters disagree, as the list prints it, and in words.
  disagreement: string
  disagreementLabel: string
  segments: readonly Segment[]
  // The bar in words: its accessible name.
  barLabel: string
}

// The hotspot list (SPEC.md, "Hotspots"), in hotspot order. Nominal
// disagreement reads as the share of rating pairs that disagree (1 − P_i);
// ordinal as how many categories apart two ratings are on average.
export function hotspotRows(dataset: Dataset, ranking: readonly Hotspot[]): HotspotRow[] {
  const ordinal = dataset.level === 'ordinal'
  return ranking.map(({ item, byCategory, disagreement }, index) => {
    const segments = distributionSegments(byCategory, dataset.categories)
    const printed = ordinal ? meanDistance(disagreement) : percent(disagreement)
    return {
      item,
      rank: index + 1,
      id: dataset.items[item]?.id ?? '',
      text: dataset.items[item]?.text ?? null,
      disagreement: printed,
      disagreementLabel: ordinal
        ? `ratings ${printed} categories apart on average`
        : `${printed} of rating pairs disagree`,
      segments,
      barLabel: segments.map(({ label }) => label).join('; '),
    }
  })
}
