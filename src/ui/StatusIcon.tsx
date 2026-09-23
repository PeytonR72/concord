export type StatusTone = 'critical' | 'warn'

type Props = { tone: StatusTone }

// The icon that goes with a status word, so status never rests on colour
// alone: a circle for a refusal or blocking error, a triangle for a warning.
export function StatusIcon({ tone }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-0.5 size-4 shrink-0 fill-none stroke-current"
      strokeWidth={1.5}
    >
      {tone === 'critical' ? (
        <>
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 4.5v4M8 11v.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M8 1.75 14.75 14H1.25Z" strokeLinejoin="round" />
          <path d="M8 6v3.5M8 11.75v.25" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
