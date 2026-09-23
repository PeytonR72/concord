// Shared class strings, in tokens only (docs/design/tokens.md).

// The centred content column and its gutter, shared by the top bar and every
// screen so the two stay aligned.
export const column = 'mx-auto w-full max-w-5xl px-4 sm:px-6'

// A screen's <main>: the column, filling the height under the top bar.
export const screenFrame = `${column} flex flex-1 flex-col py-10 sm:py-16`

export const eyebrow = 'text-caption font-semibold tracking-eyebrow text-ink-muted uppercase'

// Every button is at least 44px tall so it takes a thumb.
const button =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-small ' +
  'font-semibold transition-colors duration-150 ease-out ' +
  'disabled:cursor-progress disabled:opacity-70'

export const primaryButton = `${button} bg-accent text-on-accent hover:bg-accent-strong`

export const secondaryButton =
  `${button} border border-rule-strong bg-paper-raised text-ink hover:bg-paper-sunk`
