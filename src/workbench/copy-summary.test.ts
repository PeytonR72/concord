import { describe, expect, test } from 'vitest'
import { copyText, type TextClipboard } from './copy-summary'

describe('copyText', () => {
  test('hands the text to the clipboard and reports it copied', async () => {
    const written: string[] = []
    const clipboard: TextClipboard = {
      writeText: async (text) => {
        written.push(text)
      },
    }
    expect(await copyText('## Summary', clipboard)).toBe('copied')
    expect(written).toEqual(['## Summary'])
  })

  test('fails without a clipboard, as on a page served over plain http', async () => {
    expect(await copyText('## Summary', undefined)).toBe('failed')
  })

  test('fails when the browser refuses the write', async () => {
    const clipboard: TextClipboard = {
      writeText: () => Promise.reject(new DOMException('Write permission denied.')),
    }
    expect(await copyText('## Summary', clipboard)).toBe('failed')
  })

  test('fails when writeText throws before returning a promise', async () => {
    const clipboard: TextClipboard = {
      writeText: () => {
        throw new TypeError('Illegal invocation')
      },
    }
    expect(await copyText('## Summary', clipboard)).toBe('failed')
  })
})
