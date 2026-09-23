import type { Dataset, Level } from '../dataset/dataset'
import { pairableItems, type ItemTally } from '../metrics/coincidence'
import type { Confusion } from './confusion-shares'

// A pairable item with how much its raters disagree: 1 − P_i for nominal
// categories, the mean |i − j| over its pairs of ratings for ordinal ones.
// The tally stays on it for the list's distribution bar.
export type Hotspot = ItemTally & { disagreement: number }

// Every pairable item, most disagreed-on first (SPEC.md, "Hotspots"). Ties go
// to the item with more ratings, then to the lower item id by UTF-16 code unit
// (JavaScript's `<`), so the order doesn't depend on the browser's locale.
export function hotspots(dataset: Dataset): Hotspot[] {
  return pairableItems(dataset)
    .map((tally) => ({ ...tally, disagreement: disagreement(tally, dataset.level) }))
    .sort((x, y) => {
      if (x.disagreement !== y.disagreement) return y.disagreement - x.disagreement
      if (x.total !== y.total) return y.total - x.total
      const first = dataset.items[x.item]?.id ?? ''
      const second = dataset.items[y.item]?.id ?? ''
      return first < second ? -1 : first > second ? 1 : 0
    })
}

// The item's disagreement as one integer ratio over its m(m − 1) ordered
// pairs of ratings, so equal disagreements are equal floats and tie exactly.
function disagreement({ byCategory, total }: ItemTally, level: Level): number {
  let sum = 0
  for (const { category: c, count: nc } of byCategory) {
    for (const { category: d, count: nd } of byCategory) {
      if (c === d) continue
      sum += nc * nd * (level === 'ordinal' ? Math.abs(c - d) : 1)
    }
  }
  return sum / (total * (total - 1))
}

// The drill-down (SPEC.md, "Drill-down"): the hotspots where one rater said
// a and another said b, in hotspot order. Either order of a and b selects the
// same items. One category twice isn't a confusion, so it throws.
export function drillDown(ranking: readonly Hotspot[], { a, b }: Confusion): Hotspot[] {
  if (a === b) throw new RangeError(`A confusion needs two categories, got ${a} twice`)
  return ranking.filter(({ byCategory }) => {
    const said = new Set(byCategory.map(({ category }) => category))
    return said.has(a) && said.has(b)
  })
}
