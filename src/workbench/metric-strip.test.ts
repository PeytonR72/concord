import { describe, expect, test } from 'vitest'
import { demo } from '../demo/test-demo'
import { fromRows } from '../metrics/test-datasets'
import { datasetCounts, metricTiles } from './metric-strip'

// alice and bob agree throughout; carol agrees with them on half.
const valued = fromRows(['abcabcabcabc', 'abcabcabcabc', 'aacbbcaacbbc'])

describe('metricTiles: every metric has a value', () => {
  const [alpha, fleiss, kappa, agreement] = metricTiles(valued)

  test('α shows 3 decimals, its band in a status tone, and n in pairable values', () => {
    expect(alpha).toMatchObject({
      name: "Krippendorff's α",
      qualifier: 'nominal',
      value: '0.676',
      verdict: { word: 'tentative', tone: 'warn' },
      note: 'n = 36 pairable values',
    })
    expect(alpha?.explanation).toMatch(/^Bands after Krippendorff \(2004\)/)
    expect(alpha?.explanation).toMatch(/conventions/)
  })

  test("Fleiss' κ says what it was computed on, and its band has no status tone", () => {
    expect(fleiss).toMatchObject({
      name: "Fleiss' κ",
      qualifier: null,
      value: '0.667',
      verdict: { word: 'substantial', tone: 'plain' },
      note: 'computed on 12 of 12 items',
    })
    expect(fleiss?.explanation).toMatch(/^Bands after Landis & Koch \(1977\)/)
  })

  test('mean pairwise κ names its weighting and counts rater pairs', () => {
    expect(kappa).toMatchObject({
      name: "Mean pairwise Cohen's κ",
      qualifier: 'unweighted',
      value: '0.667',
      verdict: { word: 'substantial', tone: 'plain' },
      note: 'over 3 rater pairs',
    })
  })

  test('percent agreement is a whole percent that notes it ignores chance', () => {
    expect(agreement).toMatchObject({
      name: 'Percent agreement',
      qualifier: null,
      value: '78%',
      verdict: { word: 'ignores chance', tone: 'plain' },
      note: 'n = 12 pairable items',
    })
  })

  test('the α tones follow the bands', () => {
    const reliable = metricTiles(fromRows(['abcabcabcabc', 'abcabcabcabc']))[0]
    expect(reliable?.verdict).toEqual({ word: 'reliable', tone: 'good' })
    const unreliable = metricTiles(fromRows(['abababababab', 'babababababa', 'aabbaabbaabb']))[0]
    expect(unreliable?.verdict).toEqual({ word: 'unreliable', tone: 'critical' })
  })
})

describe('metricTiles: results that are not values', () => {
  test('too few items: Fleiss points at α, mean κ says no pair shares enough', () => {
    const [, fleiss, kappa] = metricTiles(
      fromRows(['abc.', 'acc.'], { level: 'ordinal', categories: ['1', '2', '3'] }),
    )
    expect(fleiss).toMatchObject({
      qualifier: 'nominal',
      value: 'N/A',
      verdict: { word: 'use α instead', tone: 'plain' },
      note: 'only 3 of 4 items are complete (needs 10)',
    })
    expect(fleiss?.explanation).toMatch(/every rater/)
    expect(kappa).toMatchObject({
      qualifier: 'quadratic-weighted',
      value: 'N/A',
      verdict: { word: 'too few shared items', tone: 'plain' },
      note: 'no rater pair shares 10 items (most: 3)',
    })
  })

  test('no variation', () => {
    const [alpha, fleiss, kappa, agreement] = metricTiles(
      fromRows(['aaaaaaaaaaaa', 'aaaaaaaaaaaa', 'aaaaaaaaaaaa']),
    )
    for (const tile of [alpha, fleiss, kappa]) {
      expect(tile).toMatchObject({ value: 'N/A', verdict: { word: 'no variation', tone: 'plain' } })
    }
    expect(alpha?.note).toBe('every rating is one category')
    expect(fleiss?.note).toBe('every rating is one category')
    // Mean κ's no variation is per pair: the data as a whole may still vary.
    expect(kappa?.note).toBe('every rater pair sharing enough items used one category')
    expect(agreement?.value).toBe('100%')
  })

  test('no pairable values', () => {
    const [alpha, fleiss, kappa, agreement] = metricTiles(fromRows(['ab..', '..ab']))
    for (const tile of [alpha, fleiss, kappa, agreement]) {
      expect(tile).toMatchObject({
        value: 'N/A',
        verdict: { word: 'no pairable values', tone: 'plain' },
      })
    }
    expect(alpha?.note).toBe('no item has two ratings')
    expect(kappa?.note).toBe('no two raters share an item')
  })
})

describe('metricTiles: the demo', () => {
  test('α is unreliable and every other metric has a value', () => {
    const tiles = metricTiles(demo())
    expect(tiles.map(({ name }) => name)).toEqual([
      "Krippendorff's α",
      "Fleiss' κ",
      "Mean pairwise Cohen's κ",
      'Percent agreement',
    ])
    expect(tiles[0]?.verdict).toEqual({ word: 'unreliable', tone: 'critical' })
    expect(tiles.every(({ value }) => value !== 'N/A')).toBe(true)
  })
})

describe('datasetCounts', () => {
  test('names items, raters, categories and the level', () => {
    expect(datasetCounts(valued)).toBe('12 items · 3 raters · 3 categories · nominal')
    expect(datasetCounts(fromRows(['a', 'a']))).toBe('1 item · 2 raters · 1 category · nominal')
  })
})
