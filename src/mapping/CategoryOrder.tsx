import { useState } from 'react'
import { fieldLabel, hint, iconButton } from '../ui/classes'

type Props = {
  order: readonly string[]
  onMove: (from: number, to: number) => void
}

// The ordinal category order, lowest first. Rows drag with plain HTML drag and
// drop, and every row has up and down buttons for the keyboard and for touch.
// Rows are keyed by category, so a moved row keeps its focused button, and a
// button at either end is aria-disabled rather than disabled so focus stays.
export function CategoryOrder({ order, onMove }: Props) {
  const [dragged, setDragged] = useState<number>()
  const [over, setOver] = useState<number>()

  function endDrag() {
    setDragged(undefined)
    setOver(undefined)
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${fieldLabel} mb-1`}>Category order</legend>
      <p className={hint}>
        Lowest first. Drag a row, or move it with its arrows.
      </p>
      {order.length === 0 ? (
        <p className="text-small text-ink-faint">No labels to order yet.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {order.map((category, index) => (
            <li
              key={category}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', category)
                setDragged(index)
              }}
              onDragOver={(event) => {
                if (dragged === undefined) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setOver(index)
              }}
              onDrop={(event) => {
                event.preventDefault()
                if (dragged !== undefined && dragged !== index) onMove(dragged, index)
                endDrag()
              }}
              onDragEnd={endDrag}
              className={
                'flex min-w-0 cursor-grab items-center gap-3 rounded-md border ' +
                'py-0.5 pr-0.5 pl-3 transition-colors duration-150 ease-out ' +
                (over === index && dragged !== index
                  ? 'border-accent bg-accent-wash'
                  : 'border-rule bg-paper-raised') +
                (dragged === index ? ' opacity-50' : '')
              }
            >
              <Grip />
              <span className="w-6 shrink-0 font-mono text-caption text-ink-faint tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-small">{category}</span>
              <button
                type="button"
                className={iconButton}
                aria-label={`Move ${category} up`}
                aria-disabled={index === 0}
                onClick={() => {
                  if (index > 0) onMove(index, index - 1)
                }}
              >
                <Arrow direction="up" />
              </button>
              <button
                type="button"
                className={iconButton}
                aria-label={`Move ${category} down`}
                aria-disabled={index === order.length - 1}
                onClick={() => {
                  if (index < order.length - 1) onMove(index, index + 1)
                }}
              >
                <Arrow direction="down" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </fieldset>
  )
}

function Grip() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-4 shrink-0 fill-current text-ink-faint"
    >
      {[4, 8, 12].map((y) => (
        <g key={y}>
          <circle cx="6" cy={y} r="1" />
          <circle cx="10" cy={y} r="1" />
        </g>
      ))}
    </svg>
  )
}

function Arrow({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-4 fill-none stroke-current"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === 'up' ? 'M8 13V3M4 7l4-4 4 4' : 'M8 3v10M4 9l4 4 4-4'} />
    </svg>
  )
}
