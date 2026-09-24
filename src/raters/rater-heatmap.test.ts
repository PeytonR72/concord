import { describe, expect, test } from 'vitest'
import { pairwiseKappa } from '../metrics/cohen'
import { fromRows } from '../metrics/test-datasets'
import { kappaFill, raterHeatmapCells, showsHeatmap } from './rater-heatmap'

describe('kappaFill', () => {
  test('maps κ in [0, 1] onto steps 100 to 800', () => {
    expect(kappaFill(1)).toBe(800)
    expect(kappaFill(0.5)).toBe(400)
    expect(kappaFill(0.51)).toBe(500)
    expect(kappaFill(0)).toBe(100)
  })

  test('a negative κ is its own fill, off the ramp', () => {
    expect(kappaFill(-0.01)).toBe('negative')
    expect(kappaFill(-1)).toBe('negative')
  })

  test('a κ that prints as 0.000 is not washed as negative', () => {
    expect(kappaFill(-0.0004)).toBe(100)
  })
})

describe('raterHeatmapCells', () => {
  // r0 and r1 agree on all 12 items; r2 shares only 3 with them.
  const dataset = fromRows(['abcabcabcabc', 'abcabcabcabc', 'abc.........'])
  const cells = raterHeatmapCells(dataset.raters, pairwiseKappa(dataset, 'unweighted'))

  test('is square, and both cells of a pair show the same κ', () => {
    expect(cells).toHaveLength(3)
    expect(cells[0]?.[1]).toMatchObject({ kind: 'value', printed: '1.000', fill: 800 })
    expect(cells[1]?.[0]).toMatchObject({ kind: 'value', printed: '1.000', fill: 800 })
    expect(cells[0]?.[1]?.label).toBe('r0 × r1: κ 1.000, almost perfect, 12 shared items')
  })

  test('the diagonal is the rater against themself, uncoloured', () => {
    expect(cells[1]?.[1]).toMatchObject({ kind: 'self', printed: '', fill: null })
  })

  test('a pair without a value is uncoloured and says why', () => {
    expect(cells[2]?.[0]).toMatchObject({
      kind: 'absent',
      printed: 'N/A',
      fill: null,
      label: 'r2 × r0: too few shared items (3 of 10)',
    })
  })

  test('a negative κ takes the negative fill', () => {
    const opposed = fromRows(['ababababab', 'bababababa'])
    const [row] = raterHeatmapCells(opposed.raters, pairwiseKappa(opposed, 'unweighted'))
    expect(row?.[1]).toMatchObject({ printed: '-1.000', fill: 'negative' })
  })
})

describe('showsHeatmap', () => {
  test('up to 30 raters get the heatmap; more get the list of pairs', () => {
    expect(showsHeatmap(30)).toBe(true)
    expect(showsHeatmap(31)).toBe(false)
  })
})
