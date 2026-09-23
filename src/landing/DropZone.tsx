import { type DragEvent as ReactDragEvent, useId, useState } from 'react'
import { secondaryButton } from '../ui/classes'

type Props = {
  busy: boolean
  onFiles: (files: readonly File[]) => void
}

// Drag-drop target and file picker for one CSV. It hands over whatever arrived;
// checkDroppedFiles decides whether it is a CSV.
export function DropZone({ busy, onFiles }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputId = useId()
  const hintId = useId()

  function onDragOver(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = busy ? 'none' : 'copy'
    setDragging(true)
  }

  function onDragLeave(event: ReactDragEvent<HTMLElement>) {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    setDragging(false)
  }

  function onDrop(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault()
    setDragging(false)
    if (!busy) onFiles(Array.from(event.dataTransfer.files))
  }

  return (
    <section
      aria-label="Your own file"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={
        'flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-4 py-10 ' +
        'text-center transition-colors duration-150 ease-out sm:px-8 ' +
        (dragging ? 'border-accent bg-accent-wash' : 'border-rule-strong bg-paper-raised')
      }
    >
      <p className="font-display text-heading font-medium">
        {dragging ? 'Drop to read it' : 'Or bring your own labels'}
      </p>
      <p id={hintId} className="max-w-prose text-small text-ink-muted">
        Drop a CSV here. Long (<span className="font-mono">item, rater, label</span>) or wide (one
        column per rater), with a header row.
      </p>
      <input
        id={inputId}
        type="file"
        accept=".csv,text/csv"
        className="peer sr-only"
        disabled={busy}
        aria-describedby={hintId}
        onChange={(event) => {
          const input = event.currentTarget
          onFiles(Array.from(input.files ?? []))
          // Cleared so choosing the same file again still fires a change.
          input.value = ''
        }}
      />
      {/* The visually hidden input takes focus and the disabled state, so the
          label that looks like the button mirrors them through peer-*. */}
      <label
        htmlFor={inputId}
        className={
          `${secondaryButton} cursor-pointer peer-focus-visible:outline-2 ` +
          'peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ' +
          'peer-disabled:cursor-progress peer-disabled:opacity-70'
        }
      >
        Choose a file
      </label>
    </section>
  )
}
