import { type Confusion, confusionName } from '../analysis/confusion-shares'
import { drillDown, type Hotspot } from '../analysis/hotspots'
import type { Dataset } from '../dataset/dataset'
import { counted } from '../format/number'

// The selected confusion in words: its name ("Sarcastic ↔ Negative") and its
// two categories in the same order.
export type ConfusionWords = { name: string; first: string; second: string }

export function confusionWords(
  categories: readonly string[],
  confusion: Confusion,
): ConfusionWords {
  return {
    name: confusionName(categories, confusion),
    first: categories[confusion.b] ?? '',
    second: categories[confusion.a] ?? '',
  }
}

// What a screen reader hears when the selection changes:
// "Sarcastic ↔ Negative: 61 items".
export function selectionAnnouncement(words: ConfusionWords, items: number): string {
  return `${words.name}: ${counted(items, 'item')}`
}

// One disputed item as the drill-down lists it: its id and text, and what
// each rater who rated it said, marking the ratings that are the confusion's.
export type DrillDownRow = {
  // The item's index in `dataset.items`, a stable key.
  item: number
  id: string
  text: string | null
  ratings: readonly { rater: string; category: string; inConfusion: boolean }[]
}

// The items behind a confusion (SPEC.md, "Drill-down"), in hotspot order,
// each with its raters' categories in rater order.
export function drillDownRows(
  dataset: Dataset,
  ranking: readonly Hotspot[],
  selection: Confusion,
): DrillDownRow[] {
  return drillDown(ranking, selection).map(({ item }) => ({
    item,
    id: dataset.items[item]?.id ?? '',
    text: dataset.items[item]?.text ?? null,
    ratings: dataset.raters.flatMap((rater, r) => {
      const category = dataset.ratings[r]?.[item] ?? null
      if (category === null) return []
      const inConfusion = category === selection.a || category === selection.b
      return [{ rater, category: dataset.categories[category] ?? '', inConfusion }]
    }),
  }))
}
