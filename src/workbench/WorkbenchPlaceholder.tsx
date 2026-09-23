import type { Dataset } from '../dataset/dataset'
import { eyebrow, screenFrame, secondaryButton } from '../ui/classes'

type Props = { dataset: Dataset; onStartOver: () => void }

// Stands in for the workbench until stage 10 builds it: proof the dataset
// loaded, with its counts.
export function WorkbenchPlaceholder({ dataset, onStartOver }: Props) {
  const counts: readonly (readonly [string, number])[] = [
    ['Items', dataset.items.length],
    ['Raters', dataset.raters.length],
    ['Categories', dataset.categories.length],
  ]

  return (
    <main className={`${screenFrame} gap-8`}>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-title font-medium">The dataset is loaded</h1>
        <p className="max-w-prose text-ink-muted">
          The workbench (metrics, the confusion matrix and its drill-down) is still being built.
          This is what it will read.
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-rule bg-rule">
        {counts.map(([label, count]) => (
          <div key={label} className="flex flex-col gap-1 bg-paper-raised px-4 py-4 sm:px-6">
            <dt className={eyebrow}>{label}</dt>
            <dd className="font-mono text-metric tabular-nums">{count}</dd>
          </div>
        ))}
      </dl>
      <p className="text-small text-ink-muted">
        Categories ({dataset.level}): {dataset.categories.join(', ')}.
      </p>
      <div>
        <button type="button" className={secondaryButton} onClick={onStartOver}>
          Start over
        </button>
      </div>
    </main>
  )
}
