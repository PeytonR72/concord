import type { Blocking, Warning } from '../ingest/guardrails'
import { hint } from '../ui/classes'
import { StatusIcon, type StatusTone } from '../ui/StatusIcon'
import { counted, formatNumber, guardrailMessage, type MessageContext } from './messages'

type Props = {
  blocking: readonly Blocking[]
  warnings: readonly Warning[]
  context: MessageContext
}

const boxTones: Record<StatusTone, string> = {
  critical: 'border-critical-rule bg-critical-wash',
  warn: 'border-warn-rule bg-warn-wash',
}

const titleTones: Record<StatusTone, string> = { critical: 'text-critical', warn: 'text-warn' }

// Blocking errors, then warnings, each box headed by a status word and icon.
// Warnings show beside blocking errors too, and never disable "Analyse".
export function GuardrailPanel({ blocking, warnings, context }: Props) {
  return (
    <div aria-live="polite" className="flex flex-col gap-3 empty:hidden">
      {blocking.length > 0 && (
        <StatusBox
          tone="critical"
          title={`${counted(blocking.length, 'problem')} to fix before analysing`}
          guardrails={blocking}
          context={context}
        />
      )}
      {warnings.length > 0 && (
        <StatusBox
          tone="warn"
          title={
            warnings.length === 1
              ? 'Worth a check'
              : `${formatNumber(warnings.length)} things to check`
          }
          guardrails={warnings}
          context={context}
        />
      )}
    </div>
  )
}

function StatusBox(props: {
  tone: StatusTone
  title: string
  guardrails: readonly (Blocking | Warning)[]
  context: MessageContext
}) {
  return (
    <section className={`flex flex-col gap-2 rounded-lg border px-4 py-3 ${boxTones[props.tone]}`}>
      <h2 className={`flex gap-2 text-small font-semibold ${titleTones[props.tone]}`}>
        <StatusIcon tone={props.tone} />
        {props.title}
      </h2>
      <ul className="flex flex-col gap-3 pl-6 text-small text-ink">
        {props.guardrails.map((guardrail, index) => {
          const message = guardrailMessage(guardrail, props.context)
          return (
            <li key={`${guardrail.kind}-${index}`} className="flex flex-col gap-1">
              <p>{message.text}</p>
              {message.examples.length > 0 && (
                <ul className={`${hint} flex flex-col font-mono`}>
                  {message.examples.map((example, row) => (
                    <li key={row} className="break-words">
                      {example}
                    </li>
                  ))}
                  {message.more > 0 && (
                    <li className="font-sans">and {formatNumber(message.more)} more.</li>
                  )}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
