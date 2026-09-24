// Shared class strings, in tokens only (docs/design/tokens.md).

// The centred content column and its gutter, shared by the top bar and every
// screen so the two stay aligned.
export const column = 'mx-auto w-full max-w-5xl px-4 sm:px-6'

// A screen's <main>: the column, filling the height under the top bar.
export const screenFrame = `${column} flex flex-1 flex-col py-10 sm:py-16`

// A raised card: the workbench's panels.
export const card =
  'flex min-w-0 flex-col gap-4 rounded-lg border border-rule bg-paper-raised p-4 shadow-card sm:p-5'

export const eyebrow = 'text-caption font-semibold tracking-eyebrow text-ink-muted uppercase'

// Every control is at least 44px tall so it takes a thumb. A disabled button
// says why with its cursor: add `busyButton` while something loads, or
// `blockedButton` while something must be fixed first.
const button =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-small ' +
  'font-semibold transition-colors duration-150 ease-out disabled:opacity-70'

export const primaryButton = `${button} bg-accent text-on-accent enabled:hover:bg-accent-strong`

export const secondaryButton =
  `${button} border border-rule-strong bg-paper-raised text-ink enabled:hover:bg-paper-sunk`

export const busyButton = 'disabled:cursor-progress'

export const blockedButton = 'disabled:cursor-not-allowed'

// A square icon button in a row of controls, such as moving a category. It is
// switched off with aria-disabled, so a focused button keeps focus.
export const iconButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-rule ' +
  'bg-paper-raised text-ink-muted transition-colors duration-150 ease-out ' +
  'not-aria-disabled:hover:bg-paper-sunk not-aria-disabled:hover:text-ink ' +
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-40'

// A select.
export const field =
  'min-h-11 w-full rounded-md border border-rule-strong bg-paper-raised px-3 text-small text-ink'

// A labelled form row's label.
export const fieldLabel = 'text-small font-semibold text-ink'

// A control's secondary line: a description or a count.
export const hint = 'text-caption text-ink-muted'
