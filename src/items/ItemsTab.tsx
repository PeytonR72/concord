import { useId, useMemo } from 'react'
import type { Hotspot } from '../analysis/hotspots'
import type { Dataset } from '../dataset/dataset'
import { card, hint } from '../ui/classes'
import { useShowAll } from '../ui/useShowAll'
import { distributionLegend, type Segment, type Slot } from './distribution'
import { type HotspotRow, hotspotRows } from './hotspot-list'

type Props = { dataset: Dataset; ranking: readonly Hotspot[] }

// Each category's colour (docs/design/tokens.md, "Categorical").
const slotClasses: Record<Slot, string> = {
  1: 'bg-cat-1',
  2: 'bg-cat-2',
  3: 'bg-cat-3',
  4: 'bg-cat-4',
  5: 'bg-cat-5',
  6: 'bg-cat-6',
  7: 'bg-cat-7',
  8: 'bg-cat-8',
  other: 'bg-cat-other',
}

// The Items tab (SPEC.md, "Items tab"): the hotspot list, most disagreed-on
// item first, each with what its raters said as a distribution bar under one
// legend that names every category.
export function ItemsTab({ dataset, ranking }: Props) {
  const headingId = useId()
  const rows = useMemo(() => hotspotRows(dataset, ranking), [dataset, ranking])
  const { shown, button } = useShowAll(rows, 'items')
  const ordinal = dataset.level === 'ordinal'

  return (
    <section aria-labelledby={headingId} className={card}>
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="font-display text-heading font-medium">
          Hotspots
        </h2>
        <p className="max-w-prose text-small text-ink-muted">
          Every item with two or more ratings, ranked by how much its raters disagree:{' '}
          {ordinal
            ? 'how many categories apart two of its ratings are on average.'
            : 'the share of its pairs of ratings that disagree.'}
        </p>
      </div>

      <ul
        aria-label="Categories"
        className="flex flex-wrap gap-x-4 gap-y-1 border-y border-rule py-2 text-caption"
      >
        {distributionLegend(dataset.categories).map(({ slot, name }) => (
          <li key={slot} className="inline-flex items-center gap-1.5 text-ink">
            <span aria-hidden="true" className={`size-3 rounded-sm ${slotClasses[slot]}`} />
            {name}
          </li>
        ))}
      </ul>

      <ol className="flex flex-col">
        {shown.map((row) => (
          <Row key={row.item} row={row} />
        ))}
      </ol>
      {button}
    </section>
  )
}

function Row({ row }: { row: HotspotRow }) {
  return (
    <li
      className={
        'flex flex-col gap-2 border-t border-rule py-3 first:border-t-0 first:pt-0 ' +
        'sm:flex-row sm:items-start sm:gap-6'
      }
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-mono text-caption text-ink-faint">
          {row.rank}. {row.id}
        </span>
        {row.text === null ? (
          <span className={hint}>No text in the file.</span>
        ) : (
          <p className="text-small text-ink">{row.text}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:w-64 sm:pt-5">
        <Bar segments={row.segments} label={row.barLabel} />
        <span
          data-tooltip={row.disagreementLabel}
          className="w-10 shrink-0 text-right font-mono text-small tabular-nums"
        >
          <span aria-hidden="true">{row.disagreement}</span>
          <span className="sr-only">{row.disagreementLabel}</span>
        </span>
      </div>
    </li>
  )
}

// The item's ratings by category, each segment as wide as its count, with a
// paper gap between segments. Screen readers get the counts in words.
function Bar({ segments, label }: { segments: readonly Segment[]; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex h-4 min-w-0 flex-1 gap-0.5">
      {segments.map((segment) => (
        <span
          key={segment.slot}
          data-tooltip={segment.label}
          className={`rounded-sm ${slotClasses[segment.slot]}`}
          style={{ flexGrow: segment.count, flexBasis: 0 }}
        />
      ))}
    </div>
  )
}
