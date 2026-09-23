export type Level = 'nominal' | 'ordinal'

export type Item = { id: string; text?: string }

// The canonical, mapped input (SPEC.md, "Internal model"). Whatever the file's
// shape, every metric and analysis reads this and nothing else.
export type Dataset = {
  items: readonly Item[]
  raters: readonly string[]
  // Ordinal: in the user's order. Nominal: first-seen order.
  categories: readonly string[]
  level: Level
  // The reliability matrix: ratings[r][i] is rater r's category index for
  // item i, or null when missing.
  ratings: readonly (readonly (number | null)[])[]
}
