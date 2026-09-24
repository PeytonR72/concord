export type Box = { left: number; top: number; width: number; height: number }

// The space between a tooltip and its anchor, and between it and the
// viewport's edges.
const GAP = 8

// Where a tooltip goes, in viewport pixels: centred above its anchor, or
// below it when there is no room above, and moved sideways to stay inside the
// viewport (flush left when it is wider than the viewport).
export function placeTooltip(
  anchor: Box,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): { left: number; top: number } {
  const centred = anchor.left + anchor.width / 2 - size.width / 2
  const left = Math.max(GAP, Math.min(centred, viewport.width - GAP - size.width))
  const above = anchor.top - GAP - size.height
  const top = above >= GAP ? above : anchor.top + anchor.height + GAP
  return { left, top }
}
