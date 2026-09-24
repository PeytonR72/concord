import { useId, useMemo } from 'react'
import { raterOutliers } from '../analysis/rater-outliers'
import type { Dataset } from '../dataset/dataset'
import { alpha } from '../metrics/alpha'
import {
  defaultWeighting,
  pairwiseKappa,
  type Weighting,
  WEIGHTINGS,
  weightingName,
} from '../metrics/cohen'
import { hint } from '../ui/classes'
import { pairRows } from './pair-table'
import { PairTable } from './PairTable'
import { raterHeatmapCells, showsHeatmap } from './rater-heatmap'
import { RaterHeatmap } from './RaterHeatmap'
import { raterRows } from './rater-table'
import { RaterTable } from './RaterTable'

type Props = {
  dataset: Dataset
  weighting: Weighting
  onWeighting: (weighting: Weighting) => void
}

// The Raters tab (SPEC.md, "Raters tab"): the rater table, with its outlier
// first, beside Cohen's κ for every pair of raters (a heatmap up to 30
// raters, a list above). The weighting toggle drives both κ views; the metric
// strip stays on the default weighting.
export function RatersTab({ dataset, weighting, onWeighting }: Props) {
  const pairs = useMemo(() => pairwiseKappa(dataset, weighting), [dataset, weighting])
  const full = useMemo(() => alpha(dataset), [dataset])
  const rows = useMemo(
    () => raterRows(dataset, raterOutliers(dataset, weighting), full),
    [dataset, weighting, full],
  )
  const weightingLabel = weightingName(weighting)

  return (
    <div className="flex flex-col gap-6">
      <WeightingToggle
        weighting={weighting}
        ordinal={dataset.level === 'ordinal'}
        onWeighting={onWeighting}
      />
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <RaterTable rows={rows} weightingLabel={weightingLabel} className="lg:col-span-7" />
        {showsHeatmap(dataset.raters.length) ? (
          <RaterHeatmap
            cells={raterHeatmapCells(dataset.raters, pairs)}
            raters={dataset.raters}
            weightingLabel={weightingLabel}
            className="lg:col-span-5"
          />
        ) : (
          <PairTable
            rows={pairRows(dataset.raters, pairs)}
            weightingLabel={weightingLabel}
            className="lg:col-span-5"
          />
        )}
      </div>
    </div>
  )
}

// Cohen's κ's weighting. Weights measure how far apart two categories are, so
// on nominal data, whose categories have no order, κ stays unweighted and the
// other choices are switched off with the reason beside them.
function WeightingToggle(props: {
  weighting: Weighting
  ordinal: boolean
  onWeighting: (weighting: Weighting) => void
}) {
  const labelId = useId()
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span id={labelId} className="text-small font-semibold text-ink">
        κ weighting
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="inline-flex rounded-md border border-rule-strong bg-paper-raised p-0.5"
      >
        {WEIGHTINGS.map((weighting) => {
          const pressed = weighting === props.weighting
          const unavailable = !props.ordinal && !pressed
          return (
            <button
              key={weighting}
              type="button"
              aria-pressed={pressed}
              aria-disabled={unavailable ? true : undefined}
              onClick={() => {
                if (!unavailable) props.onWeighting(weighting)
              }}
              className={
                'min-h-11 rounded-sm px-3 text-small font-semibold transition-colors ' +
                'duration-150 ease-out ' +
                (pressed
                  ? 'bg-accent text-on-accent'
                  : unavailable
                    ? 'cursor-not-allowed text-ink-faint'
                    : 'text-ink-muted hover:bg-paper-sunk hover:text-ink')
              }
            >
              {weighting}
            </button>
          )
        })}
      </div>
      <p className={hint}>
        {props.ordinal
          ? 'Weighting drives the κ in this tab; the strip above stays ' +
            `${weightingName(defaultWeighting('ordinal'))}.`
          : 'Weights need ordered categories. This dataset is nominal, so κ is unweighted.'}
      </p>
    </div>
  )
}
