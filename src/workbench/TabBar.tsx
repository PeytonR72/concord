import type { KeyboardEvent } from 'react'
import { nextTab, type Tab, TABS } from './tabs'

type Props = {
  tab: Tab
  onTab: (tab: Tab) => void
  // The ids that tie each tab to the panel: `${idBase}-${tab}` for the tab,
  // `panelId` for the panel.
  idBase: string
  panelId: string
}

// The workbench's views as underlined tabs (the WAI-ARIA tabs pattern): the
// selected tab is the one tab stop, and the arrow keys move to and select
// the others.
export function TabBar({ tab, onTab, idBase, panelId }: Props) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = nextTab(tab, event.key)
    if (next === null) return
    event.preventDefault()
    onTab(next)
    document.getElementById(`${idBase}-${next}`)?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Views"
      onKeyDown={onKeyDown}
      className="flex gap-6 border-b border-rule"
    >
      {TABS.map(({ id, name }) => {
        const selected = id === tab
        return (
          <button
            key={id}
            id={`${idBase}-${id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onTab(id)}
            className={
              '-mb-px min-h-11 border-b-2 text-small font-semibold transition-colors ' +
              'duration-150 ease-out ' +
              (selected
                ? 'border-accent text-ink'
                : 'border-transparent text-ink-muted hover:border-rule-strong hover:text-ink')
            }
          >
            {name}
          </button>
        )
      })}
    </div>
  )
}
