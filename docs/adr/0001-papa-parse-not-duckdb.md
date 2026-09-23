---
status: accepted
---

# Papa Parse, not Puddle's DuckDB seam

Puddle's `CLAUDE.md` says its single DuckDB client module is "what makes the
inter-annotator workbench reuse cheap later". Concord is that workbench, and it does not
take the reuse. This record exists so that reads as a decision, not a broken promise.

## Why

- Every metric runs in TypeScript over an in-memory reliability matrix. DuckDB would only
  parse the CSV, then hand rows back to JS for the real work.
- The target is recruiter-scale data, 50,000 ratings or fewer. Papa Parse on the main thread
  handles that in well under a second.
- DuckDB-WASM costs several megabytes, a worker, and a boot loading state on first use.
  Concord's definition of done is one click to a finished screen, and that boot is the
  slowest part of Puddle's first run.

## Consequences

- No SQL anywhere in Concord. Filtering and grouping are plain TS over the `Dataset`.
- Very large files (hundreds of MB) are out of reach. That is acceptable for v1 and is not
  on the v1.1 list; revisit only if real users bring such files.
- If a later version needs ad hoc querying of ratings, reintroducing DuckDB behind a
  single client module (Puddle's decision 5) remains the pattern to follow.
