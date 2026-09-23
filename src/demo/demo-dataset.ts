import type { Dataset } from '../dataset/dataset'
import type { LongMapping } from '../ingest/mapping'
import { mapDataset } from '../ingest/map-dataset'
import { parseCsv } from '../ingest/parse-csv'
import type { Result } from '../ingest/result'

// The bundled demo (SPEC.md, "Demo dataset"). It skips the mapping screen, so
// its mapping is fixed here: the one detection proposes for its headers.
export const DEMO_URL = `${import.meta.env.BASE_URL}demo/support-messages.csv`

export const DEMO_MAPPING: LongMapping = {
  shape: 'long',
  itemColumn: 0,
  raterColumn: 1,
  labelColumn: 2,
  textColumn: 3,
  level: 'nominal',
  categoryOrder: [],
}

// The demo CSV's text as a Dataset, through the same parser and mapping as a
// dropped file. The file is bundled and tested, so a refusal means a broken
// deploy; it is still a value, so the landing page can say so.
export function demoDataset(csvText: string): Result<Dataset, string> {
  const table = parseCsv(csvText)
  if (!table.ok) return table

  const { result } = mapDataset(table.value, DEMO_MAPPING)
  if (result.ok) return result
  const kinds = result.error.map((blocking) => blocking.kind).join(', ')
  return { ok: false, error: `The demo data failed its checks: ${kinds}.` }
}

// Fetches the demo CSV from the site and maps it.
export async function loadDemo(): Promise<Result<Dataset, string>> {
  let response: Response
  try {
    response = await fetch(DEMO_URL)
  } catch {
    return { ok: false, error: 'The demo data could not be loaded. Check your connection.' }
  }
  if (!response.ok) {
    return { ok: false, error: `The demo data could not be loaded (HTTP ${response.status}).` }
  }
  return demoDataset(await response.text())
}
