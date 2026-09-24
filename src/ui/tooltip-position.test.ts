import { describe, expect, test } from 'vitest'
import { placeTooltip } from './tooltip-position'

const viewport = { width: 1280, height: 800 }
const size = { width: 200, height: 40 }

describe('placeTooltip', () => {
  test('centres the tooltip above its anchor, a gap away', () => {
    const anchor = { left: 500, top: 300, width: 48, height: 48 }
    expect(placeTooltip(anchor, size, viewport)).toEqual({ left: 424, top: 252 })
  })

  test('goes below when there is no room above', () => {
    const anchor = { left: 500, top: 20, width: 48, height: 48 }
    expect(placeTooltip(anchor, size, viewport)).toEqual({ left: 424, top: 76 })
  })

  test('stays inside the viewport at either side', () => {
    const left = { left: 0, top: 300, width: 48, height: 48 }
    expect(placeTooltip(left, size, viewport).left).toBe(8)
    const right = { left: 1260, top: 300, width: 20, height: 48 }
    expect(placeTooltip(right, size, viewport).left).toBe(1072)
  })

  test('a tooltip wider than the viewport pins to the left margin', () => {
    const anchor = { left: 100, top: 300, width: 48, height: 48 }
    const narrow = { width: 150, height: 800 }
    expect(placeTooltip(anchor, size, narrow).left).toBe(8)
  })
})
