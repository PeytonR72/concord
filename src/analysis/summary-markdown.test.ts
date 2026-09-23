import { describe, expect, test } from 'vitest'
import { fromRows } from '../metrics/test-datasets'
import { summaryMarkdown } from './summary-markdown'

describe('summaryMarkdown', () => {
  test('a dataset where every metric has a value and one rater is flagged', () => {
    // alice and bob agree throughout; carol_2 agrees with them on half.
    const dataset = {
      ...fromRows(['abcabcabcabc', 'abcabcabcabc', 'aacbbcaacbbc'], {
        categories: ['Negative', 'Sarcastic', 'Positive'],
      }),
      raters: ['alice', 'bob', 'carol_2'],
    }

    expect(summaryMarkdown(dataset)).toMatchInlineSnapshot(`
      "## Concord agreement summary

      - **Krippendorff's α (nominal):** 0.676, tentative (n = 36 pairable values)
      - **Fleiss' κ (nominal):** 0.667, substantial (computed on 12 of 12 items)
      - **Mean pairwise Cohen's κ (unweighted):** 0.667, substantial (3 rater pairs)
      - **Percent agreement:** 78%, ignores chance (n = 12 items)

      **Dataset:** 12 items, 3 raters, 3 categories, nominal.

      ### Top confusions

      1. Negative ↔ Sarcastic: 8.0 pairings (100% of all disagreement)

      ### Flagged raters

      - carol\\_2: α would be 1.000 without carol\\_2

      ---

      Computed in Concord (in the browser; the file never left the tab).
      "
    `)
  })

  test('too few items, fewer than 3 raters, ordinal', () => {
    const dataset = fromRows(['abc.', 'acc.'], { level: 'ordinal', categories: ['1', '2', '3'] })

    expect(summaryMarkdown(dataset)).toMatchInlineSnapshot(`
      "## Concord agreement summary

      - **Krippendorff's α (ordinal):** 0.778, tentative (n = 6 pairable values)
      - **Fleiss' κ (nominal):** too few items (3 of 10)
      - **Mean pairwise Cohen's κ (quadratic-weighted):** too few items (3 of 10)
      - **Percent agreement:** 67%, ignores chance (n = 3 items)

      **Dataset:** 4 items, 2 raters, 3 categories, ordinal.

      ### Top confusions

      1. 2 ↔ 3: 2.0 pairings (100% of all disagreement)

      ### Flagged raters

      None: leave-one-out α needs at least 3 raters.

      ---

      Computed in Concord (in the browser; the file never left the tab).
      "
    `)
  })

  test('no variation and no disagreement', () => {
    expect(summaryMarkdown(fromRows(['aaaaaaaaaaaa', 'aaaaaaaaaaaa', 'aaaaaaaaaaaa'])))
      .toMatchInlineSnapshot(`
        "## Concord agreement summary

        - **Krippendorff's α (nominal):** no variation (n = 36 pairable values)
        - **Fleiss' κ (nominal):** no variation (computed on 12 of 12 items)
        - **Mean pairwise Cohen's κ (unweighted):** no variation (3 rater pairs)
        - **Percent agreement:** 100%, ignores chance (n = 12 items)

        **Dataset:** 12 items, 3 raters, 1 category, nominal.

        ### Top confusions

        None: the raters never disagree.

        ### Flagged raters

        None.

        ---

        Computed in Concord (in the browser; the file never left the tab).
        "
      `)
  })
})
