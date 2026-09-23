import type { Dataset } from './dataset/dataset'
import type { RawTable } from './ingest/parse-csv'
import type { Result } from './ingest/result'

// Which screen the app shell shows, and the landing page's own progress. The
// demo skips the mapping screen; a dropped file goes through it.
export type Screen =
  | { screen: 'landing'; status: LandingStatus }
  | { screen: 'mapping'; fileName: string; table: RawTable }
  | { screen: 'workbench'; dataset: Dataset }

export type LandingStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; source: 'demo' }
  | { kind: 'loading'; source: 'file'; fileName: string }
  | { kind: 'refused'; message: string }

export type ScreenAction =
  | { type: 'demo-requested' }
  | { type: 'demo-loaded'; result: Result<Dataset, string> }
  | { type: 'file-requested'; fileName: string }
  | { type: 'file-refused'; message: string }
  | { type: 'file-read'; fileName: string; result: Result<RawTable, string> }
  | { type: 'returned-to-landing' }

export const initialScreen: Screen = { screen: 'landing', status: { kind: 'idle' } }

// One load at a time: requests are ignored while one is in flight, and a result
// arriving for a load nobody is waiting on is dropped.
export function screenReducer(state: Screen, action: ScreenAction): Screen {
  switch (action.type) {
    case 'returned-to-landing':
      return initialScreen

    case 'demo-requested':
      if (!canStart(state)) return state
      return { screen: 'landing', status: { kind: 'loading', source: 'demo' } }

    case 'file-requested':
      if (!canStart(state)) return state
      return {
        screen: 'landing',
        status: { kind: 'loading', source: 'file', fileName: action.fileName },
      }

    case 'file-refused':
      if (!canStart(state)) return state
      return refused(action.message)

    case 'demo-loaded': {
      if (loading(state)?.source !== 'demo') return state
      const { result } = action
      return result.ok ? { screen: 'workbench', dataset: result.value } : refused(result.error)
    }

    case 'file-read': {
      const waiting = loading(state)
      if (waiting?.source !== 'file' || waiting.fileName !== action.fileName) return state
      const { result, fileName } = action
      if (!result.ok) return refused(`${fileName} couldn't be read. ${result.error}`)
      return { screen: 'mapping', fileName, table: result.value }
    }
  }
}

function canStart(state: Screen): boolean {
  return state.screen === 'landing' && loading(state) === undefined
}

// The load in flight, if any.
function loading(state: Screen): Extract<LandingStatus, { kind: 'loading' }> | undefined {
  if (state.screen !== 'landing' || state.status.kind !== 'loading') return undefined
  return state.status
}

function refused(message: string): Screen {
  return { screen: 'landing', status: { kind: 'refused', message } }
}
