import { useEffect, useId, useRef, useState } from 'react'
import { summaryMarkdown } from '../analysis/summary-markdown'
import type { Dataset } from '../dataset/dataset'
import { card, hint, primaryButton, secondaryButton } from '../ui/classes'
import { copyText } from './copy-summary'

// How long the button reads "Copied" after a copy.
const COPIED_MS = 2000

type State = { kind: 'idle' } | { kind: 'copied' } | { kind: 'failed'; markdown: string }

// The Copy summary button (SPEC.md, "Summary Markdown"), and the fallback it
// opens when the browser won't copy: the Markdown in a selectable textarea.
// The two sit in different places in the workbench header, so they come back
// separately.
export function useCopySummary(dataset: Dataset) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    window.clearTimeout(timer.current)
    const markdown = summaryMarkdown(dataset)
    if ((await copyText(markdown, navigator.clipboard)) === 'failed') {
      setState({ kind: 'failed', markdown })
      return
    }
    setState({ kind: 'copied' })
    timer.current = window.setTimeout(() => setState({ kind: 'idle' }), COPIED_MS)
  }

  const copied = state.kind === 'copied'
  const button = (
    <>
      <button type="button" className={primaryButton} onClick={copy}>
        {/* Both labels share one grid cell, so the button keeps the wider
            one's width and "Start over" doesn't shift beside it. */}
        <span className="grid">
          <span className={`col-start-1 row-start-1 ${copied ? 'invisible' : ''}`}>
            Copy summary
          </span>
          <span className={`col-start-1 row-start-1 ${copied ? '' : 'invisible'}`}>Copied</span>
        </span>
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Summary copied as Markdown.' : ''}
      </span>
    </>
  )
  const fallback =
    state.kind === 'failed' ? (
      <CopyFallback markdown={state.markdown} onClose={() => setState({ kind: 'idle' })} />
    ) : null
  return { button, fallback }
}

// The summary for copying by hand. It arrives with its text selected, so
// Ctrl+C (or ⌘C) is all that's left to do.
function CopyFallback({ markdown, onClose }: { markdown: string; onClose: () => void }) {
  const fieldId = useId()
  const field = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    field.current?.focus()
    field.current?.select()
  }, [])

  return (
    <section className={card} aria-labelledby={`${fieldId}-label`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <label
            id={`${fieldId}-label`}
            htmlFor={fieldId}
            className="font-display text-heading font-medium"
          >
            Copy the summary by hand
          </label>
          <p className={hint}>
            Your browser didn&rsquo;t let Concord write to the clipboard. The Markdown is selected
            below: copy it with Ctrl+C (⌘C on a Mac).
          </p>
        </div>
        <button type="button" className={secondaryButton} onClick={onClose}>
          Close
        </button>
      </div>
      <textarea
        ref={field}
        id={fieldId}
        readOnly
        rows={14}
        value={markdown}
        className={
          'w-full resize-y rounded-md border border-rule-strong bg-paper p-3 font-mono ' +
          'text-caption text-ink tabular-nums'
        }
      />
    </section>
  )
}
