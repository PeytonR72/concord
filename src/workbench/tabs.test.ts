import { describe, expect, test } from 'vitest'
import { nextTab, TABS } from './tabs'

describe('TABS', () => {
  test('Confusion, Raters, Items, in that order', () => {
    expect(TABS.map(({ name }) => name)).toEqual(['Confusion', 'Raters', 'Items'])
  })
})

describe('nextTab', () => {
  test('the arrows step, wrapping at the ends', () => {
    expect(nextTab('confusion', 'ArrowRight')).toBe('raters')
    expect(nextTab('items', 'ArrowRight')).toBe('confusion')
    expect(nextTab('confusion', 'ArrowLeft')).toBe('items')
    expect(nextTab('items', 'ArrowLeft')).toBe('raters')
  })

  test('Home and End go to the first and last tab', () => {
    expect(nextTab('raters', 'Home')).toBe('confusion')
    expect(nextTab('raters', 'End')).toBe('items')
  })

  test('other keys are not the bar’s', () => {
    expect(nextTab('raters', 'ArrowDown')).toBeNull()
    expect(nextTab('raters', 'Enter')).toBeNull()
  })
})
