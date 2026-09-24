import { fromPartial } from '@total-typescript/shoehorn'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { confusionShares } from '../analysis/confusion-shares'
import { raterOutliers } from '../analysis/rater-outliers'
import type { Dataset } from '../dataset/dataset'
import { detectShape } from '../ingest/detect-shape'
import { checkDataset } from '../ingest/guardrails'
import { parseCsv } from '../ingest/parse-csv'
import { alpha } from '../metrics/alpha'
import { coincidenceMatrix } from '../metrics/coincidence'
import { value } from '../metrics/test-datasets'
import { DEMO_MAPPING, demoDataset, loadDemo } from './demo-dataset'
import { demo, demoCsv as csv } from './test-demo'

function category(dataset: Dataset, name: string): number {
  return dataset.categories.indexOf(name)
}

describe('demoDataset', () => {
  it('uses the mapping detection proposes for the demo headers', () => {
    const table = parseCsv(csv)
    if (!table.ok) throw new Error(table.error)
    expect(DEMO_MAPPING).toEqual(detectShape(table.value.headers))
  })

  it('passes every guardrail without a warning', () => {
    expect(checkDataset(demo())).toEqual({ blocking: [], warnings: [] })
  })

  it('keeps every message text', () => {
    expect(demo().items.every((item) => item.text !== undefined && item.text !== '')).toBe(true)
  })

  it('refuses text that is not the demo', () => {
    expect(demoDataset('item,rater,label,text\n').ok).toBe(false)
    expect(demoDataset('').ok).toBe(false)
  })
})

// The story the demo tells (SPEC.md, "Demo dataset").
describe('the demo story', () => {
  const dataset = demo()

  it('has about 200 messages, 5 raters and the four labels in reading order', () => {
    expect(dataset.items.length).toBeGreaterThanOrEqual(190)
    expect(dataset.items.length).toBeLessThanOrEqual(210)
    expect(dataset.raters).toHaveLength(5)
    expect(dataset.categories).toEqual(['Positive', 'Neutral', 'Negative', 'Sarcastic'])
    expect(dataset.level).toBe('nominal')
  })

  it('is missing about 8% of ratings', () => {
    const cells = dataset.raters.length * dataset.items.length
    const missing = dataset.ratings.flat().filter((rating) => rating === null).length
    expect(missing / cells).toBeGreaterThanOrEqual(0.06)
    expect(missing / cells).toBeLessThanOrEqual(0.1)
  })

  it('has Sarcastic ↔ Negative as the largest confusion by a clear margin', () => {
    const [largest, second] = confusionShares(coincidenceMatrix(dataset))
    const sarcastic = category(dataset, 'Sarcastic')
    const negative = category(dataset, 'Negative')
    const pair = [Math.min(sarcastic, negative), Math.max(sarcastic, negative)]
    expect([largest?.a, largest?.b]).toEqual(pair)
    expect(largest?.share ?? 0).toBeGreaterThanOrEqual(1.5 * (second?.share ?? 0))
  })

  it('flags only the rater who leans on Neutral', () => {
    const neutral = category(dataset, 'Neutral')
    const neutralShare = dataset.ratings.map((row) => {
      const rated = row.filter((rating) => rating !== null)
      return rated.filter((rating) => rating === neutral).length / rated.length
    })
    const leaner = neutralShare.indexOf(Math.max(...neutralShare))

    const flagged = raterOutliers(dataset)
      .filter((outlier) => outlier.flagged)
      .map((outlier) => outlier.rater)
    expect(flagged).toEqual([leaner])
  })

  it('has α between 0.55 and 0.65', () => {
    const result = value(alpha(dataset))
    expect(result).toBeGreaterThanOrEqual(0.55)
    expect(result).toBeLessThanOrEqual(0.65)
  })
})

describe('loadDemo', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function respond(response: Partial<Response>) {
    vi.stubGlobal('fetch', () => Promise.resolve(fromPartial<Response>(response)))
  }

  it('maps the fetched CSV', async () => {
    respond({ ok: true, text: () => Promise.resolve(csv) })
    expect(await loadDemo()).toEqual({ ok: true, value: demo() })
  })

  it('refuses when the request fails', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')))
    expect(await loadDemo()).toEqual({
      ok: false,
      error: 'The demo data could not be loaded. Check your connection.',
    })
  })

  it('refuses an HTTP error', async () => {
    respond({ ok: false, status: 404 })
    expect(await loadDemo()).toEqual({
      ok: false,
      error: 'The demo data could not be loaded (HTTP 404).',
    })
  })

  it('refuses when the body breaks off, rather than hanging', async () => {
    respond({ ok: true, text: () => Promise.reject(new TypeError('network error')) })
    expect(await loadDemo()).toEqual({
      ok: false,
      error: 'The demo data could not be loaded. Check your connection.',
    })
  })
})
