import { fromPartial } from '@total-typescript/shoehorn'
import { describe, expect, it } from 'vitest'
import type { Dataset } from './dataset/dataset'
import type { RawTable } from './ingest/parse-csv'
import { initialScreen, type Screen, screenReducer } from './screen'

const dataset = fromPartial<Dataset>({ raters: ['alice', 'bob'] })
const table = fromPartial<RawTable>({ headers: ['item', 'rater', 'label'] })

const loadingDemo: Screen = { screen: 'landing', status: { kind: 'loading', source: 'demo' } }
const readingFile: Screen = {
  screen: 'landing',
  status: { kind: 'loading', source: 'file', fileName: 'labels.csv' },
}

describe('screenReducer', () => {
  it('starts idle on the landing page', () => {
    expect(initialScreen).toEqual({ screen: 'landing', status: { kind: 'idle' } })
  })

  it('loads the demo into the workbench, skipping the mapping screen', () => {
    const loading = screenReducer(initialScreen, { type: 'demo-requested' })
    expect(loading).toEqual(loadingDemo)
    expect(
      screenReducer(loading, { type: 'demo-loaded', result: { ok: true, value: dataset } }),
    ).toEqual({ screen: 'workbench', dataset })
  })

  it('shows a demo refusal on the landing page', () => {
    expect(
      screenReducer(loadingDemo, { type: 'demo-loaded', result: { ok: false, error: 'Offline.' } }),
    ).toEqual({ screen: 'landing', status: { kind: 'refused', message: 'Offline.' } })
  })

  it('reads a file into the mapping screen', () => {
    const reading = screenReducer(initialScreen, {
      type: 'file-requested',
      fileName: 'labels.csv',
    })
    expect(reading).toEqual(readingFile)
    expect(
      screenReducer(reading, {
        type: 'file-read',
        fileName: 'labels.csv',
        result: { ok: true, value: table },
      }),
    ).toEqual({ screen: 'mapping', fileName: 'labels.csv', table })
  })

  it("names the file in a parser's refusal", () => {
    expect(
      screenReducer(readingFile, {
        type: 'file-read',
        fileName: 'labels.csv',
        result: { ok: false, error: 'The file is empty.' },
      }),
    ).toEqual({
      screen: 'landing',
      status: { kind: 'refused', message: "labels.csv couldn't be read. The file is empty." },
    })
  })

  it('shows a refusal from the file check as it is', () => {
    expect(
      screenReducer(initialScreen, { type: 'file-refused', message: "a.xlsx isn't a CSV." }),
    ).toEqual({ screen: 'landing', status: { kind: 'refused', message: "a.xlsx isn't a CSV." } })
  })

  it('clears a refusal when the next attempt starts', () => {
    const refused: Screen = { screen: 'landing', status: { kind: 'refused', message: 'No.' } }
    expect(screenReducer(refused, { type: 'demo-requested' })).toEqual(loadingDemo)
  })

  it('ignores new requests while something is loading', () => {
    expect(screenReducer(loadingDemo, { type: 'file-requested', fileName: 'x.csv' })).toBe(
      loadingDemo,
    )
    expect(screenReducer(readingFile, { type: 'demo-requested' })).toBe(readingFile)
    expect(screenReducer(readingFile, { type: 'file-refused', message: 'No.' })).toBe(
      readingFile,
    )
  })

  it('ignores a result nobody is waiting for', () => {
    const demoLoaded = { type: 'demo-loaded', result: { ok: true, value: dataset } } as const
    expect(screenReducer(initialScreen, demoLoaded)).toBe(initialScreen)
    expect(screenReducer(readingFile, demoLoaded)).toBe(readingFile)
    expect(
      screenReducer(readingFile, {
        type: 'file-read',
        fileName: 'other.csv',
        result: { ok: true, value: table },
      }),
    ).toBe(readingFile)
  })

  it('returns to an idle landing page from any screen', () => {
    const workbench: Screen = { screen: 'workbench', dataset }
    expect(screenReducer(workbench, { type: 'returned-to-landing' })).toEqual(initialScreen)
  })
})
