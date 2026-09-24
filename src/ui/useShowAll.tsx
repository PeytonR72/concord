import { useState } from 'react'
import { formatNumber } from '../format/number'
import { secondaryButton } from './classes'

// How many rows a long list shows before "Show all".
const FIRST_ROWS = 50

// A long list's first rows, and the button that shows the rest ("Show all
// 212 items"), or null when every row shows. Keying the list's owner resets
// it. The button only shows above FIRST_ROWS, so its noun is always plural.
export function useShowAll<Row>(rows: readonly Row[], nouns: string) {
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? rows : rows.slice(0, FIRST_ROWS)
  const button =
    shown.length < rows.length ? (
      <div>
        <button type="button" className={secondaryButton} onClick={() => setShowAll(true)}>
          Show all {formatNumber(rows.length)} {nouns}
        </button>
      </div>
    ) : null
  return { shown, button }
}
