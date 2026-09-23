import { describe, expect, it } from 'vitest'
import { checkDroppedFiles } from './check-dropped-files'

function file(name: string, type = 'text/csv') {
  return { name, type }
}

describe('checkDroppedFiles', () => {
  it('accepts one .csv file and returns it', () => {
    const labels = file('labels.csv')
    expect(checkDroppedFiles([labels])).toEqual({ ok: true, value: labels })
  })

  it.each(['text/csv', 'application/vnd.ms-excel', ''])(
    'accepts a .csv the browser reports as %j',
    (type) => {
      expect(checkDroppedFiles([file('labels.csv', type)]).ok).toBe(true)
    },
  )

  it('reads the extension case-insensitively', () => {
    expect(checkDroppedFiles([file('LABELS.CSV')]).ok).toBe(true)
  })

  it('refuses another extension by name, pointing at the planned formats', () => {
    expect(checkDroppedFiles([file('report.xlsx', '')])).toEqual({
      ok: false,
      error:
        "report.xlsx isn't a CSV. Concord reads .csv files; Excel and TSV support is planned.",
    })
  })

  it('refuses a .csv reported as plain text', () => {
    expect(checkDroppedFiles([file('labels.csv', 'text/plain')]).ok).toBe(false)
  })

  it('refuses a file with no extension', () => {
    expect(checkDroppedFiles([file('labels', '')]).ok).toBe(false)
  })

  it('refuses a .csv name whose type says it is something else', () => {
    expect(checkDroppedFiles([file('scan.csv', 'application/pdf')])).toEqual({
      ok: false,
      error:
        "scan.csv isn't a CSV: the browser reports it as application/pdf. " +
        'Concord reads .csv files; Excel and TSV support is planned.',
    })
  })

  it('refuses more than one file', () => {
    expect(checkDroppedFiles([file('a.csv'), file('b.csv')])).toEqual({
      ok: false,
      error: 'Drop one file at a time. Concord reads a single CSV per session.',
    })
  })

  it('refuses a drop with no file in it', () => {
    expect(checkDroppedFiles([])).toEqual({
      ok: false,
      error: 'Nothing to read: drop a .csv file, or choose one.',
    })
  })
})
