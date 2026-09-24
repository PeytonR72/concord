export type StatusTone = 'critical' | 'warn'

type Props = { tone: StatusTone | 'good' }

// The icon that goes with a status word, so status never rests on colour
// alone: a circle for a refusal, blocking error or unreliable α, a triangle
// for a warning or tentative α, a tick for reliable α.
export function StatusIcon({ tone }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-0.5 size-4 shrink-0 fill-none stroke-current"
      strokeWidth={1.5}
    >
      {tone === 'critical' && (
        <>
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 4.5v4M8 11v.5" strokeLinecap="round" />
        </>
      )}
      {tone === 'warn' && (
        <>
          <path d="M8 1.75 14.75 14H1.25Z" strokeLinejoin="round" />
          <path d="M8 6v3.5M8 11.75v.25" strokeLinecap="round" />
        </>
      )}
      {tone === 'good' && (
        <>
          <circle cx="8" cy="8" r="6.5" />
          <path d="m5.25 8.25 1.75 1.75 3.75-4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}
