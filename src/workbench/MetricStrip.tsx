import { useId } from 'react'
import { hint } from '../ui/classes'
import { StatusIcon } from '../ui/StatusIcon'
import type { Tone } from '../format/result-words'
import type { MetricTile } from './metric-strip'

type Props = { tiles: readonly MetricTile[] }

// α's bands are verdicts: a status wash, colour and icon, always beside the
// word. Everything else is plain ink.
const verdictTones: Record<Tone, string> = {
  good: 'bg-good-wash text-good',
  warn: 'bg-warn-wash text-warn',
  critical: 'bg-critical-wash text-critical',
  plain: 'text-ink-muted',
}

// The headline metrics, one tile each: name, value, band and n.
export function MetricStrip({ tiles }: Props) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="sr-only">
        Headline metrics
      </h2>
      <dl
        className={
          'grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule bg-rule ' +
          'shadow-card lg:grid-cols-4'
        }
      >
        {tiles.map((tile) => (
          <Tile key={tile.name} tile={tile} />
        ))}
      </dl>
    </section>
  )
}

function Tile({ tile }: { tile: MetricTile }) {
  const explanationId = useId()
  const { tone, word } = tile.verdict
  return (
    <div className="flex min-w-0 flex-col gap-2 bg-paper-raised p-4 sm:px-5">
      <dt className="flex flex-col">
        <span className="text-small font-semibold text-ink">{tile.name}</span>
        <span className={hint}>{tile.qualifier ?? <>&nbsp;</>}</span>
      </dt>
      <dd className="font-mono text-metric tabular-nums">{tile.value}</dd>
      <dd>
        {/* Focusable so the band's source reaches keyboard users too. */}
        <button
          type="button"
          data-tooltip={tile.explanation}
          aria-describedby={explanationId}
          className="-mx-1 inline-flex min-h-11 cursor-help items-center gap-1.5 rounded-md px-1"
        >
          <span
            className={
              'inline-flex items-center gap-1 rounded-sm text-small font-semibold ' +
              `${verdictTones[tone]} ${tone === 'plain' ? '' : 'px-1.5'}`
            }
          >
            {tone !== 'plain' && <StatusIcon tone={tone} />}
            {word}
          </span>
          <InfoIcon />
        </button>
        <span id={explanationId} className="sr-only">
          {tile.explanation}
        </span>
      </dd>
      <dd className={hint}>{tile.note}</dd>
    </div>
  )
}

function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-4 shrink-0 fill-none stroke-current text-ink-faint"
      strokeWidth={1.5}
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 7.5V11M8 5v.25" strokeLinecap="round" />
    </svg>
  )
}
