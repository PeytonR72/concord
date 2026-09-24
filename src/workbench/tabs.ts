// The workbench's views, under the metric strip.
export type Tab = 'confusion' | 'raters' | 'items'

export const TABS: readonly { id: Tab; name: string }[] = [
  { id: 'confusion', name: 'Confusion' },
  { id: 'raters', name: 'Raters' },
  { id: 'items', name: 'Items' },
]

// Where a key moves in the tab bar (the WAI-ARIA tabs pattern): the arrows
// step and wrap, Home and End go to the ends. Null for a key the bar doesn't
// handle.
export function nextTab(current: Tab, key: string): Tab | null {
  const at = TABS.findIndex(({ id }) => id === current)
  const to = (index: number) => TABS[(index + TABS.length) % TABS.length]?.id ?? current
  switch (key) {
    case 'ArrowLeft':
      return to(at - 1)
    case 'ArrowRight':
      return to(at + 1)
    case 'Home':
      return to(0)
    case 'End':
      return to(TABS.length - 1)
    default:
      return null
  }
}
