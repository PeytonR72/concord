import { describe, expect, test } from 'vitest'
import { counted, decimal, formatNumber, pairings, percent } from './number'

describe('formatNumber', () => {
  test('groups thousands', () => {
    expect(formatNumber(1204)).toBe('1,204')
    expect(formatNumber(50000)).toBe('50,000')
    expect(formatNumber(7)).toBe('7')
  })
})

describe('counted', () => {
  test('pairs a grouped count with its noun, singular only for one', () => {
    expect(counted(1, 'item')).toBe('1 item')
    expect(counted(0, 'item')).toBe('0 items')
    expect(counted(1204, 'row')).toBe('1,204 rows')
    expect(counted(4, 'category', 'categories')).toBe('4 categories')
  })
})

describe('the metric formats', () => {
  test('decimal gives α and κ 3 decimals', () => {
    expect(decimal(0.6)).toBe('0.600')
    expect(decimal(-0.12345)).toBe('-0.123')
  })

  test('percent gives whole percents', () => {
    expect(percent(0.784)).toBe('78%')
    expect(percent(1)).toBe('100%')
    expect(percent(0.2146)).toBe('21%')
  })

  test('a value that rounds to zero loses its minus sign', () => {
    expect(decimal(-0.0001)).toBe('0.000')
    expect(pairings(-0.04)).toBe('0.0')
    expect(percent(-0.004)).toBe('0%')
    expect(pairings(-0.2)).toBe('-0.2')
  })

  test('pairings gives 1 decimal', () => {
    expect(pairings(38.4999)).toBe('38.5')
    expect(pairings(12)).toBe('12.0')
  })
})
