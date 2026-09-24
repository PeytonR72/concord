import { useEffect, useReducer } from 'react'
import type { Dataset } from './dataset/dataset'
import { loadDemo } from './demo/demo-dataset'
import { readCsvFile } from './ingest/parse-csv'
import { checkDroppedFiles } from './landing/check-dropped-files'
import { Landing } from './landing/Landing'
import { MappingScreen } from './mapping/MappingScreen'
import { initialScreen, screenReducer } from './screen'
import { column } from './ui/classes'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { Workbench } from './workbench/Workbench'

// The app shell: a top bar over whichever screen the state names.
export function App() {
  const [state, dispatch] = useReducer(screenReducer, initialScreen)

  // A file dropped anywhere but the drop zone would make the browser open it
  // and leave the page, so the window swallows drops nothing else takes.
  useEffect(() => {
    const swallow = (event: DragEvent) => event.preventDefault()
    window.addEventListener('dragover', swallow)
    window.addEventListener('drop', swallow)
    return () => {
      window.removeEventListener('dragover', swallow)
      window.removeEventListener('drop', swallow)
    }
  }, [])

  async function tryDemo() {
    dispatch({ type: 'demo-requested' })
    dispatch({ type: 'demo-loaded', result: await loadDemo() })
  }

  async function readFiles(files: readonly File[]) {
    const checked = checkDroppedFiles(files)
    if (!checked.ok) {
      dispatch({ type: 'file-refused', message: checked.error })
      return
    }
    const fileName = checked.value.name
    dispatch({ type: 'file-requested', fileName })
    dispatch({ type: 'file-read', fileName, result: await readCsvFile(checked.value) })
  }

  function analyse(dataset: Dataset) {
    dispatch({ type: 'mapping-confirmed', dataset })
  }

  function startOver() {
    dispatch({ type: 'returned-to-landing' })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule">
        <div
          className={`${column} flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3`}
        >
          <span className="font-display text-heading font-semibold tracking-tight">Concord</span>
          <span className="text-small text-ink-muted">The file never leaves the tab.</span>
        </div>
      </header>

      <ErrorBoundary onStartOver={startOver}>
        {state.screen === 'landing' && (
          <Landing status={state.status} onTryDemo={tryDemo} onFiles={readFiles} />
        )}
        {state.screen === 'mapping' && (
          <MappingScreen
            key={state.fileName}
            fileName={state.fileName}
            table={state.table}
            onAnalyse={analyse}
            onStartOver={startOver}
          />
        )}
        {state.screen === 'workbench' && (
          <Workbench dataset={state.dataset} onStartOver={startOver} />
        )}
      </ErrorBoundary>
    </div>
  )
}
