// The outcome of a step that can refuse its input. Refusals are values, not
// exceptions, so the UI renders them like any other state.
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
