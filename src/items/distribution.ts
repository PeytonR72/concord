import { formatNumber } from '../format/number'
import type { ItemTally } from '../metrics/coincidence'

// A categorical colour, cat-1 to cat-8, or cat-other for the categories
// folded together above eight (docs/design/tokens.md, "Categorical").
export type Slot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'other'

const SLOTS: readonly Slot[] = [1, 2, 3, 4, 5, 6, 7, 8]

// A dataset with more categories than slots keeps the first seven and folds
// the rest into Other, so the bar never cycles colours.
function slotOf(category: number, categories: number): Slot {
  if (categories > SLOTS.length && category >= SLOTS.length - 1) return 'other'
  return SLOTS[category] ?? 'other'
}

export type LegendEntry = { slot: Slot; name: string }

// The legend over the bars: every category by its slot, the folded ones as
// "Other".
export function distributionLegend(categories: readonly string[]): LegendEntry[] {
  const legend: LegendEntry[] = []
  categories.forEach((name, category) => {
    const slot = slotOf(category, categories.length)
    if (slot !== 'other') legend.push({ slot, name })
    else if (!legend.some((entry) => entry.slot === 'other')) legend.push({ slot, name: 'Other' })
  })
  return legend
}

// One segment of an item's bar, as wide as its count.
export type Segment = {
  slot: Slot
  count: number
  // The tooltip: the category (or the folded ones) and its count.
  label: string
}

// An item's ratings as the bar draws them, in category order. The folded
// categories become one Other segment whose tooltip names them.
export function distributionSegments(
  byCategory: ItemTally['byCategory'],
  categories: readonly string[],
): Segment[] {
  const total = byCategory.reduce((sum, { count }) => sum + count, 0)
  const ratings = (count: number) => `${formatNumber(count)} of ${formatNumber(total)} ratings`
  const segments: Segment[] = []
  const folded: { name: string; count: number }[] = []
  for (const { category, count } of [...byCategory].sort((x, y) => x.category - y.category)) {
    const slot = slotOf(category, categories.length)
    const name = categories[category] ?? ''
    if (slot === 'other') folded.push({ name, count })
    else segments.push({ slot, count, label: `${name}: ${ratings(count)}` })
  }
  if (folded.length === 0) return segments
  const count = folded.reduce((sum, entry) => sum + entry.count, 0)
  const names = folded.map(({ name }) => name).join(', ')
  return [...segments, { slot: 'other', count, label: `Other (${names}): ${ratings(count)}` }]
}
