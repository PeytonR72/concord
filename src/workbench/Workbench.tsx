import { useMemo, useState } from 'react'
import { type Confusion, confusionShares } from '../analysis/confusion-shares'
import { hotspots } from '../analysis/hotspots'
import type { Dataset } from '../dataset/dataset'
import { coincidenceMatrix } from '../metrics/coincidence'
import { eyebrow, screenFrame, secondaryButton } from '../ui/classes'
import { TooltipLayer } from '../ui/TooltipLayer'
import { ConfusionMatrix } from './ConfusionMatrix'
import { DrillDown } from './DrillDown'
import { confusionWords, drillDownRows, selectionAnnouncement } from './drill-down'
import { heatmapCells, initialSelection } from './heatmap'
import { datasetCounts, metricTiles } from './metric-strip'
import { MetricStrip } from './MetricStrip'

type Props = { dataset: Dataset; onStartOver: () => void }

// The workbench: the headline metrics over the confusion view, which opens on
// the largest confusion with its disputed items listed beside it.
export function Workbench({ dataset, onStartOver }: Props) {
  const { categories } = dataset
  const tiles = useMemo(() => metricTiles(dataset), [dataset])
  const matrix = useMemo(() => coincidenceMatrix(dataset), [dataset])
  const shares = useMemo(() => confusionShares(matrix), [matrix])
  const cells = useMemo(
    () => heatmapCells(matrix, shares, categories),
    [matrix, shares, categories],
  )
  const ranking = useMemo(() => hotspots(dataset), [dataset])

  // A plain { a, b } value: v1.1's guideline clarification will consume it.
  const [selection, setSelection] = useState(() => initialSelection(shares))
  const rows = useMemo(
    () => (selection === null ? [] : drillDownRows(dataset, ranking, selection)),
    [dataset, ranking, selection],
  )
  const words = selection === null ? null : confusionWords(categories, selection)
  // Announced from here, since the drill-down remounts on every selection and a
  // live region that arrives with its text isn't read out.
  const [announcement, setAnnouncement] = useState('')

  function select(confusion: Confusion) {
    setSelection(confusion)
    const selected = drillDownRows(dataset, ranking, confusion).length
    setAnnouncement(selectionAnnouncement(confusionWords(categories, confusion), selected))
  }

  return (
    <main className={`${screenFrame} gap-8`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className={eyebrow}>Workbench</p>
          <h1 className="font-display text-title font-medium">How far the raters agree</h1>
          <p className="text-small text-ink-muted">{datasetCounts(dataset)}</p>
        </div>
        <button type="button" className={secondaryButton} onClick={onStartOver}>
          Start over
        </button>
      </div>

      <MetricStrip tiles={tiles} />

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <ConfusionMatrix
          cells={cells}
          categories={categories}
          selection={selection}
          onSelect={select}
          className="lg:sticky lg:top-6 lg:col-span-5"
        />
        <DrillDown
          key={selection === null ? 'none' : `${selection.a},${selection.b}`}
          confusion={words}
          rows={rows}
          className="lg:col-span-7"
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <TooltipLayer />
    </main>
  )
}
