import { describe, expect, test } from 'vitest'
import { confusionShares } from '../analysis/confusion-shares'
import { demo } from '../demo/test-demo'
import { coincidenceMatrix } from '../metrics/coincidence'
import { fromRows } from '../metrics/test-datasets'
import {
  cellConfusion,
  heatmapCells,
  initialSelection,
  isSelected,
  moveFocus,
  shareStep,
} from './heatmap'

describe('shareStep', () => {
  test('maps a share linearly onto steps 100 to 800, the largest always 800', () => {
    expect(shareStep(0.4, 0.4)).toBe(800)
    expect(shareStep(0.2, 0.4)).toBe(400)
    expect(shareStep(0.21, 0.4)).toBe(500)
    expect(shareStep(0.05, 0.4)).toBe(100)
  })

  test('any share above zero gets at least the lightest step', () => {
    expect(shareStep(0.0001, 0.4)).toBe(100)
  })
})

describe('heatmapCells', () => {
  // a/b split on 4 items, b/c on 2, a agreed on 2; c is never paired with a.
  const dataset = fromRows(['aaaabbaa', 'bbbbccaa'], { categories: ['A', 'B', 'C'] })
  const matrix = coincidenceMatrix(dataset)
  const cells = heatmapCells(matrix, confusionShares(matrix), dataset.categories)

  test('is k × k, one row per category', () => {
    expect(cells).toHaveLength(3)
    expect(cells.every((row) => row.length === 3)).toBe(true)
  })

  test('a confusion cell prints its share, coloured on the scale, with the tooltip copy', () => {
    const [, ab] = cells[0] ?? []
    expect(ab).toMatchObject({
      kind: 'confusion',
      printed: '67%',
      step: 800,
      label: 'B ↔ A: 8.0 pairings (67% of all disagreement)',
    })
    // Both cells of a confusion read the same, later category first.
    expect(cells[1]?.[0]).toMatchObject({
      printed: '67%',
      label: 'B ↔ A: 8.0 pairings (67% of all disagreement)',
    })
    expect(cells[2]?.[1]).toMatchObject({ printed: '33%', step: 400 })
  })

  test('the diagonal prints its pairings, uncoloured', () => {
    expect(cells[0]?.[0]).toMatchObject({
      kind: 'diagonal',
      printed: '4.0',
      step: null,
      label: 'A ↔ A: 4.0 pairings in agreement',
    })
  })

  test('a pair nobody confused is empty', () => {
    expect(cells[0]?.[2]).toMatchObject({
      kind: 'empty',
      printed: '',
      step: null,
      label: 'C ↔ A: no pairings',
    })
  })

  test('a share under half a percent prints as under 1%', () => {
    const rows = ['a'.repeat(300) + 'a', 'b'.repeat(300) + 'c']
    const tiny = fromRows(rows)
    const tinyMatrix = coincidenceMatrix(tiny)
    const grid = heatmapCells(tinyMatrix, confusionShares(tinyMatrix), tiny.categories)
    expect(grid[0]?.[2]?.printed).toBe('<1%')
  })

  test('with no disagreement every off-diagonal cell is empty', () => {
    const agreed = fromRows(['abab', 'abab'])
    const agreedMatrix = coincidenceMatrix(agreed)
    const grid = heatmapCells(agreedMatrix, confusionShares(agreedMatrix), agreed.categories)
    expect(grid[0]?.[1]?.kind).toBe('empty')
    expect(grid[1]?.[0]?.kind).toBe('empty')
  })
})

describe('selection', () => {
  test('the largest confusion is pre-selected; with no disagreement nothing is', () => {
    const matrix = coincidenceMatrix(demo())
    const categories = demo().categories
    const selection = initialSelection(confusionShares(matrix))
    expect(selection).toEqual({
      a: categories.indexOf('Negative'),
      b: categories.indexOf('Sarcastic'),
    })
    expect(initialSelection([])).toBeNull()
  })

  test('a confusion cell selects its pair; the diagonal and empty cells select nothing', () => {
    const dataset = fromRows(['aaaabbaa', 'bbbbccaa'])
    const matrix = coincidenceMatrix(dataset)
    const grid = heatmapCells(matrix, confusionShares(matrix), dataset.categories)
    const at = (row: number, column: number) => {
      const cell = grid[row]?.[column]
      if (cell === undefined) throw new RangeError(`no cell ${row},${column}`)
      return cell
    }
    expect(cellConfusion(at(2, 1))).toEqual({ a: 1, b: 2 })
    expect(cellConfusion(at(1, 2))).toEqual({ a: 1, b: 2 })
    expect(cellConfusion(at(1, 1))).toBeNull()
    expect(cellConfusion(at(0, 2))).toBeNull()
  })

  test('both cells of the selected pair read as selected', () => {
    const selection = { a: 2, b: 3 }
    expect(isSelected(selection, 3, 2)).toBe(true)
    expect(isSelected(selection, 2, 3)).toBe(true)
    expect(isSelected(selection, 2, 2)).toBe(false)
    expect(isSelected(null, 3, 2)).toBe(false)
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
