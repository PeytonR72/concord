// A schematic of the confusion view for the landing page, drawn with the
// heatmap tokens. It is illustrative, not computed: the real matrix is the
// workbench's.
const CATEGORIES = ['Positive', 'Neutral', 'Negative', 'Sarcastic']

// Symmetric like a coincidence matrix; the diagonal stays neutral.
const SHADES: readonly (readonly string[])[] = [
  ['bg-viz-diagonal', 'bg-seq-300', 'bg-seq-100', 'bg-seq-200'],
  ['bg-seq-300', 'bg-viz-diagonal', 'bg-seq-400', 'bg-seq-300'],
  ['bg-seq-100', 'bg-seq-400', 'bg-viz-diagonal', 'bg-seq-800'],
  ['bg-seq-200', 'bg-seq-300', 'bg-seq-800', 'bg-viz-diagonal'],
]

// Sarcastic ↔ Negative, the confusion the demo opens on.
const SELECTED = { row: 3, column: 2 }

const LABEL =
  'A four-by-four confusion matrix of Positive, Neutral, Negative and Sarcastic, ' +
  'darkest where Sarcastic meets Negative'

export function SchematicFigure() {
  return (
    <figure
      className="flex flex-col gap-3 rounded-lg border border-rule bg-paper-raised p-5 shadow-card"
    >
      <div
        role="img"
        aria-label={LABEL}
        className={
          'grid grid-cols-[auto_repeat(4,minmax(0,1fr))] gap-0.5 text-caption text-ink-muted'
        }
      >
        <span />
        {CATEGORIES.map((category) => (
          <span key={category} className="truncate pb-1 text-center">
            {category.slice(0, 3)}
          </span>
        ))}
        {CATEGORIES.map((rowCategory, row) => (
          <Row key={rowCategory} label={rowCategory} row={row} />
        ))}
      </div>
      <figcaption className="text-small text-ink-faint">
        <span className="font-semibold text-ink-muted">Fig. 1.</span> The confusion view, in
        outline. The darker a cell, the more of the disagreement it holds. The demo opens on
        Sarcastic&nbsp;↔&nbsp;Negative.
      </figcaption>
    </figure>
  )
}

function Row({ label, row }: { label: string; row: number }) {
  return (
    <>
      <span className="self-center pr-2 text-right">{label}</span>
      {CATEGORIES.map((category, column) => {
        const selected = row === SELECTED.row && column === SELECTED.column
        return (
          <span
            key={category}
            className={
              `aspect-square rounded-sm ${SHADES[row]?.[column] ?? ''}` +
              (selected ? ' outline-2 -outline-offset-2 outline-ink' : '')
            }
          />
        )
      })}
    </>
  )
}
