// How Concord writes numbers, shared by the screens and the summary Markdown
// so a value reads the same everywhere: α and κ with 3 decimals, percent
// agreement and shares as whole percents, pairings with 1 decimal, ordinal
// distances with 2, and counts with thousands separators.

const numbers = new Intl.NumberFormat('en')

// A count with thousands separators: "1,204".
export function formatNumber(value: number): string {
  return numbers.format(value)
}

// A count and its noun: "1 item", "1,204 rows".
export function counted(count: number, noun: string, plural = `${noun}s`): string {
  return `${formatNumber(count)} ${count === 1 ? noun : plural}`
}

// α and κ.
export function decimal(value: number): string {
  return fixed(value, 3)
}

// Percent agreement and disagreement shares.
export function percent(value: number): string {
  return `${fixed(value * 100, 0)}%`
}

// A coincidence matrix's pairings, which are sums of 1/(m − 1) weights.
export function pairings(value: number): string {
  return fixed(value, 1)
}

// An ordinal hotspot's mean distance between ratings, in categories.
export function meanDistance(value: number): string {
  return fixed(value, 2)
}

// toFixed, without the minus sign on a value that rounds to zero.
function fixed(value: number, digits: number): string {
  const text = value.toFixed(digits)
  return Number(text) === 0 ? (0).toFixed(digits) : text
}
