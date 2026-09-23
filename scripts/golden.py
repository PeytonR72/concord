"""Golden values for the demo dataset (SPEC.md, "Demo cross-check").

Computes the demo's headline metrics with the reference libraries, not with
Concord's code, and writes src/demo/golden.json. src/demo/golden.test.ts checks
that Concord matches it to 1e-6. Run by hand, never by `npm test`, whenever
scripts/build-demo.mjs changes the CSV:

    python -m venv scripts/.venv
    scripts/.venv/Scripts/python -m pip install numpy scikit-learn statsmodels krippendorff
    scripts/.venv/Scripts/python scripts/golden.py

The libraries' defaults differ from Concord's rules in places, so this script
applies Concord's rules (SPEC.md, "Metrics") around them:

- Fleiss' kappa (statsmodels) on complete items only: items every rater
  labelled. Raters with no ratings at all would be ignored; the demo has none.
- Cohen's kappa (sklearn, unweighted) per rater pair on the items both
  labelled. The mean leaves out pairs with fewer than 10 shared items or no
  variation, and its n counts the pairs it averages.
- Krippendorff's alpha (krippendorff, nominal); its n counts pairable values,
  ratings on items with at least two ratings.
- Percent agreement has no reference library, so it is computed here from its
  definition: the mean over pairable items of the share of agreeing rater pairs.

The demo CSV is long (item, rater, label, text) and has no missing tokens: a
missing rating is a missing row. Categories are indexed in first-seen order,
as Concord's nominal mapping does; no metric here depends on that order.
"""

import csv
import itertools
import json
from collections import Counter
from importlib.metadata import version
from pathlib import Path

import krippendorff
import numpy as np
from sklearn.metrics import cohen_kappa_score
from statsmodels.stats.inter_rater import aggregate_raters, fleiss_kappa

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "public" / "demo" / "support-messages.csv"
OUTPUT = ROOT / "src" / "demo" / "golden.json"

# The fewest shared (Cohen) or complete (Fleiss) items a kappa is reported on.
MINIMUM_ITEMS = 10

LIBRARIES = ["scikit-learn", "statsmodels", "krippendorff"]


def read_matrix():
    """The reliability matrix: raters x items, category index or NaN."""
    items, raters, categories = {}, {}, {}
    ratings = {}
    with CSV.open(newline="", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            item = items.setdefault(row["item"], len(items))
            rater = raters.setdefault(row["rater"], len(raters))
            category = categories.setdefault(row["label"], len(categories))
            if (rater, item) in ratings:
                raise ValueError(f"{row['rater']} rated {row['item']} twice")
            ratings[(rater, item)] = category

    matrix = np.full((len(raters), len(items)), np.nan)
    for (rater, item), category in ratings.items():
        matrix[rater, item] = category
    return list(raters), list(categories), matrix


def alpha(matrix):
    pairable = np.sum(~np.isnan(matrix), axis=0) >= 2
    n = int(np.sum(~np.isnan(matrix[:, pairable])))
    value = krippendorff.alpha(reliability_data=matrix, level_of_measurement="nominal")
    return {"value": float(value), "n": n}


def fleiss(matrix, category_count):
    complete = ~np.any(np.isnan(matrix), axis=0)
    n = int(np.sum(complete))
    if n < MINIMUM_ITEMS:
        raise ValueError(f"only {n} complete items")
    # aggregate_raters wants items x raters and counts categories 0..n_cat-1.
    table, _ = aggregate_raters(matrix[:, complete].T.astype(int), n_cat=category_count)
    return {"value": float(fleiss_kappa(table, method="fleiss")), "n": n}


def pairwise_kappa(matrix, raters):
    pairs = []
    for a, b in itertools.combinations(range(len(raters)), 2):
        shared = ~np.isnan(matrix[a]) & ~np.isnan(matrix[b])
        x, y = matrix[a, shared].astype(int), matrix[b, shared].astype(int)
        n = int(np.sum(shared))
        variation = len(set(x) | set(y)) > 1
        value = float(cohen_kappa_score(x, y)) if n >= MINIMUM_ITEMS and variation else None
        pairs.append({"a": raters[a], "b": raters[b], "value": value, "n": n})
    return pairs


def mean_kappa(pairs):
    values = [pair["value"] for pair in pairs if pair["value"] is not None]
    if not values:
        raise ValueError("no pair has a kappa")
    return {"value": float(np.mean(values)), "n": len(values)}


def percent_agreement(matrix):
    shares = []
    for column in matrix.T:
        labels = column[~np.isnan(column)]
        m = len(labels)
        if m < 2:
            continue
        agreeing = sum(count * (count - 1) for count in Counter(labels).values())
        shares.append(agreeing / (m * (m - 1)))
    return {"value": float(np.mean(shares)), "n": len(shares)}


def main():
    raters, categories, matrix = read_matrix()
    pairs = pairwise_kappa(matrix, raters)
    golden = {
        "comment": f"Written by scripts/golden.py from {CSV.relative_to(ROOT).as_posix()}. "
        "Do not edit.",
        "libraries": {name: version(name) for name in LIBRARIES},
        "alpha": alpha(matrix),
        "fleissKappa": fleiss(matrix, len(categories)),
        "meanPairwiseKappa": mean_kappa(pairs),
        "percentAgreement": percent_agreement(matrix),
        "pairwiseKappa": pairs,
        "leaveOneOutAlpha": [
            {"rater": rater, **alpha(np.delete(matrix, index, axis=0))}
            for index, rater in enumerate(raters)
        ],
    }
    OUTPUT.write_text(json.dumps(golden, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({key: golden[key] for key in ["alpha", "fleissKappa", "meanPairwiseKappa"]}))
    print("LOO", [(row["rater"], round(row["value"], 3)) for row in golden["leaveOneOutAlpha"]])


if __name__ == "__main__":
    main()
