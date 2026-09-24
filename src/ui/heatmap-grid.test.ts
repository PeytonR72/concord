import { describe, expect, test } from 'vitest'
import { moveFocus, rampStep } from './heatmap-grid'

describe('rampStep', () => {
  test('maps [0, 1] linearly onto steps 100 to 800', () => {
    expect(rampStep(1)).toBe(800)
    expect(rampStep(0.5)).toBe(400)
    expect(rampStep(0.51)).toBe(500)
    expect(rampStep(0.125)).toBe(100)
    expect(rampStep(0.126)).toBe(200)
  })

  test('zero and anything just above it take the lightest step', () => {
    expect(rampStep(0)).toBe(100)
    expect(rampStep(0.0001)).toBe(100)
  })
})

describe('moveFocus', () => {
  const at = { row: 1, column: 1 }

  test('arrows move one cell, stopping at the edges', () => {
    expect(moveFocus(at, 'ArrowUp', 3)).toEqual({ row: 0, column: 1 })
    expect(moveFocus(at, 'ArrowDown', 3)).toEqual({ row: 2, column: 1 })
    expect(moveFocus(at, 'ArrowLeft', 3)).toEqual({ row: 1, column: 0 })
    expect(moveFocus(at, 'ArrowRight', 3)).toEqual({ row: 1, column: 2 })
    expect(moveFocus({ row: 0, column: 2 }, 'ArrowUp', 3)).toEqual({ row: 0, column: 2 })
    expect(moveFocus({ row: 0, column: 2 }, 'ArrowRight', 3)).toEqual({ row: 0, column: 2 })
  })

  test('Home and End go to the row’s ends', () => {
    expect(moveFocus(at, 'Home', 3)).toEqual({ row: 1, column: 0 })
    expect(moveFocus(at, 'End', 3)).toEqual({ row: 1, column: 2 })
  })

  test('other keys are not the grid’s', () => {
    expect(moveFocus(at, 'Enter', 3)).toBeNull()
    expect(moveFocus(at, 'a', 3)).toBeNull()
  })
})
