import { describe, expect, test } from 'vitest'
import readme from '../README.md?raw'
import spec from '../SPEC.md?raw'

// The bullets under a "Deferred to v1.1" heading, each joined across its
// wrapped lines, so the two files may wrap them differently.
function deferred(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/)
  const start = lines.findIndex((line) => /^#+ Deferred to v1\.1/.test(line))
  if (start === -1) return []
  const items: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('#')) break
    if (line.startsWith('- ')) items.push(line.slice(2).trim())
    else if (line.startsWith('  ') && items.length > 0) items.push(`${items.pop()} ${line.trim()}`)
  }
  return items
}

describe('README', () => {
  test('lists exactly the spec’s deferred capabilities', () => {
    expect(deferred(spec).length).toBeGreaterThan(0)
    expect(deferred(readme)).toEqual(deferred(spec))
  })
})
