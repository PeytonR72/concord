import type { LandingStatus } from '../screen'
import { eyebrow, primaryButton, screenFrame } from '../ui/classes'
import { DropZone } from './DropZone'
import { SchematicFigure } from './SchematicFigure'

type Props = {
  status: LandingStatus
  onTryDemo: () => void
  onFiles: (files: readonly File[]) => void
}

export function Landing({ status, onTryDemo, onFiles }: Props) {
  const busy = status.kind === 'loading'
  const loadingDemo = status.kind === 'loading' && status.source === 'demo'

  return (
    <main className={`${screenFrame} gap-10`}>
      <section className="grid items-center gap-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col gap-5">
          <p className={eyebrow}>Inter-annotator agreement</p>
          <h1 className="font-display text-display font-medium tracking-tight text-balance">
            See where your raters disagree, and which categories they can&rsquo;t tell apart.
          </h1>
          <p className="max-w-prose text-ink-muted">
            Drop in a CSV of labels from several raters. Concord measures how much they agree
            (Krippendorff&rsquo;s α, Cohen&rsquo;s and Fleiss&rsquo; κ), finds the category pairs
            your guidelines fail to separate, and lists the items behind each one.
          </p>
          <div className="flex flex-col items-start gap-3 pt-1">
            <button type="button" className={primaryButton} onClick={onTryDemo} disabled={busy}>
              {loadingDemo ? 'Loading the demo…' : 'Try the demo'}
            </button>
            <p className="max-w-prose text-small text-ink-faint">
              <span className="font-semibold text-ink-muted">Synthetic data.</span> The demo is
              customer-support messages written for Concord and labelled by five invented raters.
            </p>
          </div>
        </div>
        <SchematicFigure />
      </section>

      <DropZone busy={busy} onFiles={onFiles} />
      <LandingStatusMessage status={status} />
    </main>
  )
}

function LandingStatusMessage({ status }: { status: LandingStatus }) {
  return (
    <div aria-live="polite" className="empty:hidden">
      {status.kind === 'loading' && status.source === 'file' && (
        <p className="text-small text-ink-muted">
          Reading <span className="font-mono">{status.fileName}</span>…
        </p>
      )}
      {status.kind === 'refused' && (
        <div
          role="alert"
          className={
            'flex gap-3 rounded-lg border border-critical-rule bg-critical-wash px-4 py-3 ' +
            'text-small text-critical'
          }
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="mt-0.5 size-4 shrink-0 fill-none stroke-current"
            strokeWidth={1.5}
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 4.5v4M8 11v.5" strokeLinecap="round" />
          </svg>
          <p>{status.message}</p>
        </div>
      )}
    </div>
  )
}
