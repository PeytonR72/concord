# Concord domain vocabulary

Use these terms in code, UI copy and docs. When a term here disagrees with a library's
naming, this file wins inside Concord.

- **Item**: one thing that was labelled (a message, an image, a sentence). Krippendorff calls it a *unit*.
- **Rater**: one person or system that assigned labels. Also *annotator* or *coder* in input headers; always `rater` in code.
- **Category**: one of the possible label values. The set of categories is the label scheme.
- **Rating**: one rater's category for one item. May be missing.
- **Label**: the raw string in the input file before it becomes a category. Once mapped, say *category*.
- **Dataset**: the canonical, mapped input: items, raters, ordered categories, level, and the reliability matrix.
- **Reliability matrix**: raters × items grid of category indices or `null`. The one input every metric takes.
- **Level of measurement**: `nominal` (categories unordered) or `ordinal` (ordered). Interval and ratio are deferred.
- **Shape**: the input file's layout, `long` (one rating per row) or `wide` (one item per row, one column per rater).
- **Mapping**: the user-confirmed choice of shape, columns, level and category order that turns a raw table into a dataset.
- **Pairable value**: a rating on an item that has at least two ratings. Only pairable values enter α.
- **Pairable item**: an item with at least two ratings. Overall percent agreement averages over these.
- **Coincidence matrix**: category × category matrix of pairable values, each item contributing its ordered pairs weighted 1/(m−1). The confusion view shows it.
- **Metric result**: a metric's outcome: a value with its n, *no variation* (a chance-corrected metric on data with one category, so its chance term is zero), *too few items* (fewer shared or complete items than a κ trusts, with n and the minimum), or *no pairable values*.
- **Shared item**: an item both raters of a pair labelled. Cohen's κ and pair percent agreement use these.
- **Complete item**: an item every rater labelled (raters with no ratings at all aside). Fleiss' κ uses only these.
- **Confusion**: an off-diagonal pair of categories {a, b} in the coincidence matrix. The drill-down selection is a confusion.
- **Disagreement share**: a confusion's fraction of all off-diagonal mass.
- **Hotspot**: an item ranked by how much its raters disagree (1 − P_i, or mean ordinal distance).
- **Outlier rater**: a rater whose removal raises α by at least 0.05 (leave-one-out α).
- **Band**: the verdict word attached to a metric value (for example *tentative*), from a cited convention.
