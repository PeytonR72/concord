import { describe, expect, test } from 'vitest'
import { distributionLegend, distributionSegments } from './distribution'

const four = ['Positive', 'Neutral', 'Negative', 'Sarcastic']
const ten = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

describe('distributionLegend', () => {
  test('one slot per category, in category order', () => {
    expect(distributionLegend(four)).toEqual([
      { slot: 1, name: 'Positive' },
      { slot: 2, name: 'Neutral' },
      { slot: 3, name: 'Negative' },
      { slot: 4, name: 'Sarcastic' },
    ])
  })

  test('eight categories fill every slot', () => {
    const eight = ten.slice(0, 8)
    expect(distributionLegend(eight).map(({ slot }) => slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  test('above eight, categories 8 and up fold into Other', () => {
    const legend = distributionLegend(ten)
    expect(legend).toHaveLength(8)
    expect(legend[6]).toEqual({ slot: 7, name: 'G' })
    expect(legend[7]).toEqual({ slot: 'other', name: 'Other' })
  })
})

describe('distributionSegments', () => {
  test('one segment per category said, in category order, with its count', () => {
    const byCategory = [
      { category: 3, count: 2 },
      { category: 2, count: 2 },
      { category: 1, count: 1 },
    ]
    expect(distributionSegments(byCategory, four)).toEqual([
      { slot: 2, count: 1, label: 'Neutral: 1 of 5 ratings' },
      { slot: 3, count: 2, label: 'Negative: 2 of 5 ratings' },
      { slot: 4, count: 2, label: 'Sarcastic: 2 of 5 ratings' },
    ])
  })

  test('the folded categories are one Other segment that names them', () => {
    const byCategory = [
      { category: 0, count: 1 },
      { category: 9, count: 1 },
      { category: 7, count: 2 },
    ]
    expect(distributionSegments(byCategory, ten)).toEqual([
      { slot: 1, count: 1, label: 'A: 1 of 4 ratings' },
      { slot: 'other', count: 3, label: 'Other (H, J): 3 of 4 ratings' },
    ])
  })
})
