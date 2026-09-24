// The one method of `navigator.clipboard` the Copy summary button uses. It is
// missing outside a secure context, so the button passes it as possibly
// undefined.
export type TextClipboard = { writeText: (text: string) => Promise<void> }

export type CopyOutcome = 'copied' | 'failed'

// Writes the text to the clipboard. A missing clipboard, a refused write and a
// write that throws all fail the same way: the button then shows the text for
// the user to copy by hand.
export async function copyText(
  text: string,
  clipboard: TextClipboard | undefined,
): Promise<CopyOutcome> {
  if (clipboard === undefined) return 'failed'
  try {
    await clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
