import Papa from 'papaparse'
import { expect, test } from 'vitest'

// Proves the toolchain end to end: Vitest runs in node, TypeScript resolves
// Papa Parse's types, and the parser is installed. Stage 2 replaces this with
// real tests of ingest/parse-csv.ts.
test('Papa Parse reads a header row and a record', () => {
  const result = Papa.parse('item,rater,label\nm001,alice,Negative', {
    header: true,
  })

  expect(result.errors).toEqual([])
  expect(result.data).toEqual([
    { item: 'm001', rater: 'alice', label: 'Negative' },
  ])
})
