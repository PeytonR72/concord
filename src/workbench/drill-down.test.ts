import { describe, expect, test } from 'vitest'
import { hotspots } from '../analysis/hotspots'
import { demo } from '../demo/test-demo'
import { fromRows } from '../metrics/test-datasets'
import { confusionWords, drillDownRows, selectionAnnouncement } from './drill-down'

describe('drillDownRows', () => {
  const dataset = {
    ...fromRows(['aab.', 'bba.', 'b.ba'], { categories: ['Negative', 'Sarcastic'] }),
    items: [{ id: 'm1', text: 'Great, another outage.' }, { id: 'm2' }, { id: 'm3' }, { id: 'm4' }],
    raters: ['alice', 'bob', 'carol'],
  }

  test('lists the items behind the confusion, most disputed first, with text', () => {
    const rows = drillDownRows(dataset, hotspots(dataset), { a: 0, b: 1 })
    // m2 splits 1–1; m1 and m3 split 2–1 and tie, so they go by id.
    expect(rows.map(({ id }) => id)).toEqual(['m2', 'm1', 'm3'])
    expect(rows[1]?.text).toBe('Great, another outage.')
    expect(rows[0]?.text).toBeNull()
  })

  test("gives each rater's category, leaving out raters who didn't rate it", () => {
    const [m2] = drillDownRows(dataset, hotspots(dataset), { a: 0, b: 1 })
    expect(m2?.ratings).toEqual([
      { rater: 'alice', category: 'Negative', inConfusion: true },
      { rater: 'bob', category: 'Sarcastic', inConfusion: true },
    ])
  })

  test('marks only the ratings that are the confusion’s', () => {
    const three = { ...dataset, categories: ['Negative', 'Sarcastic', 'Neutral'] }
    const withNeutral = { ...three, ratings: [[0], [1], [2]], items: [{ id: 'm1' }] }
    const [m1] = drillDownRows(withNeutral, hotspots(withNeutral), { a: 0, b: 1 })
    expect(m1?.ratings.map(({ inConfusion }) => inConfusion)).toEqual([true, true, false])
  })

  test('the demo opens on the Sarcastic/Negative splits', () => {
    const data = demo()
    const a = data.categories.indexOf('Negative')
    const b = data.categories.indexOf('Sarcastic')
    const rows = drillDownRows(data, hotspots(data), { a, b })
    expect(rows.length).toBeGreaterThan(10)
    for (const { ratings } of rows) {
      const said = ratings.map(({ category }) => category)
      expect(said).toContain('Negative')
      expect(said).toContain('Sarcastic')
    }
  })
})

describe('confusionWords', () => {
  const categories = ['Positive', 'Neutral', 'Negative', 'Sarcastic']

  test('names the confusion and its categories later first', () => {
    expect(confusionWords(categories, { a: 2, b: 3 })).toEqual({
      name: 'Sarcastic ↔ Negative',
      first: 'Sarcastic',
      second: 'Negative',
    })
  })

  test('the announcement names the confusion and counts its items', () => {
    const words = confusionWords(categories, { a: 1, b: 2 })
    expect(selectionAnnouncement(words, 34)).toBe('Negative ↔ Neutral: 34 items')
    expect(selectionAnnouncement(words, 1)).toBe('Negative ↔ Neutral: 1 item')
  })
})
