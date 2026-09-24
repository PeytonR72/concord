import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { placeTooltip } from './tooltip-position'

// What the tooltip shows and what it points at. `moved` counts scrolls and
// resizes, so the tooltip is placed again whenever its anchor may have moved.
type Shown = { text: string; anchor: HTMLElement; moved: number }

// The screen's one tooltip: the `data-tooltip` text of whatever element is
// hovered or focused, so it works from the keyboard as well as the mouse. It
// is drawn fixed to the viewport, so a scrolling card can't clip it, and it
// follows its anchor through scrolls (focusing a cell can scroll the matrix).
// Screen readers get the same text from the element itself (its accessible
// name or description), so this copy is hidden from them.
export function TooltipLayer() {
  const [shown, setShown] = useState<Shown | null>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const tooltip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const anchorOf = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLElement>('[data-tooltip]') : null
    const show = (event: Event) => {
      const anchor = anchorOf(event.target)
      const text = anchor?.dataset.tooltip
      if (anchor && text) setShown({ text, anchor, moved: 0 })
    }
    // Moving between an anchor's children isn't leaving it.
    const leave = (event: PointerEvent) => {
      if (anchorOf(event.target) !== anchorOf(event.relatedTarget)) setShown(null)
    }
    const hide = () => setShown(null)
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide()
    }
    const move = () => setShown((current) => current && { ...current, moved: current.moved + 1 })

    document.addEventListener('pointerover', show)
    document.addEventListener('pointerout', leave)
    document.addEventListener('focusin', show)
    document.addEventListener('focusout', hide)
    document.addEventListener('keydown', escape)
    window.addEventListener('scroll', move, { capture: true, passive: true })
    window.addEventListener('resize', move)
    return () => {
      document.removeEventListener('pointerover', show)
      document.removeEventListener('pointerout', leave)
      document.removeEventListener('focusin', show)
      document.removeEventListener('focusout', hide)
      document.removeEventListener('keydown', escape)
      window.removeEventListener('scroll', move, { capture: true })
      window.removeEventListener('resize', move)
    }
  }, [])

  // Measured before paint, so the tooltip never shows in the wrong place. Its
  // width is its text's (w-max, capped by max-w-72), not whatever room is left
  // where the last tooltip sat. An anchor that left the page takes it along.
  useLayoutEffect(() => {
    const element = tooltip.current
    if (shown === null || element === null) {
      setPosition(null)
      return
    }
    if (!shown.anchor.isConnected) {
      setShown(null)
      return
    }
    const size = { width: element.offsetWidth, height: element.offsetHeight }
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    setPosition(placeTooltip(shown.anchor.getBoundingClientRect(), size, viewport))
  }, [shown])

  if (shown === null) return null
  return (
    <div
      ref={tooltip}
      aria-hidden="true"
      style={position ?? { left: 0, top: 0 }}
      className={
        'pointer-events-none fixed z-20 w-max max-w-72 rounded-md bg-ink px-3 py-2 text-caption ' +
        `text-paper shadow-card ${position === null ? 'invisible' : ''}`
      }
    >
      {shown.text}
    </div>
  )
}
