import { type Dispatch, useId } from 'react'
import type { Mapping, WideMapping } from '../ingest/mapping'
import { field, fieldLabel, hint, secondaryButton } from '../ui/classes'
import { CategoryOrder } from './CategoryOrder'
import type { MappingEdit } from './edit-mapping'
import { columnLabel, counted, formatNumber } from './messages'

type Props = {
  headers: readonly string[]
  mapping: Mapping
  dispatch: Dispatch<MappingEdit>
}

// A card-like option in a radio group: the whole box is the target, and the
// visually hidden radio carries focus and the checked state.
const choice =
  'flex min-h-11 cursor-pointer flex-col justify-center rounded-md border border-rule ' +
  'bg-paper-raised px-3 py-2 transition-colors duration-150 ease-out hover:bg-paper-sunk ' +
  'has-checked:border-accent has-checked:bg-accent-wash has-focus-visible:outline-2 ' +
  'has-focus-visible:outline-offset-2 has-focus-visible:outline-accent'

export function MappingForm({ headers, mapping, dispatch }: Props) {
  return (
    <form className="flex flex-col gap-6" onSubmit={(event) => event.preventDefault()}>
      <Choices
        legend="Shape"
        name="shape"
        value={mapping.shape}
        options={[
          { value: 'long', title: 'Long', description: 'One rating per row' },
          { value: 'wide', title: 'Wide', description: 'One item per row' },
        ]}
        onChange={(shape) => dispatch({ type: 'shape-chosen', shape })}
      />

      <ColumnSelect
        label="Item"
        headers={headers}
        value={mapping.itemColumn}
        onChange={(column) => dispatch({ type: 'item-column-chosen', column })}
      />

      {mapping.shape === 'long' ? (
        <>
          <ColumnSelect
            label="Rater"
            headers={headers}
            value={mapping.raterColumn}
            onChange={(column) => dispatch({ type: 'rater-column-chosen', column })}
          />
          <ColumnSelect
            label="Label"
            headers={headers}
            value={mapping.labelColumn}
            onChange={(column) => dispatch({ type: 'label-column-chosen', column })}
          />
        </>
      ) : (
        <RaterColumns headers={headers} mapping={mapping} dispatch={dispatch} />
      )}

      <ColumnSelect
        label="Text"
        hint="Optional. Shown beside disputed items."
        headers={headers}
        value={mapping.textColumn}
        onChange={(column) => dispatch({ type: 'text-column-chosen', column })}
        noneLabel="None"
      />

      <Choices
        legend="Level of measurement"
        name="level"
        value={mapping.level}
        options={[
          { value: 'nominal', title: 'Nominal', description: 'Categories have no order' },
          { value: 'ordinal', title: 'Ordinal', description: 'Categories run low to high' },
        ]}
        onChange={(level) => dispatch({ type: 'level-chosen', level })}
      />

      {mapping.level === 'ordinal' && (
        <CategoryOrder
          order={mapping.categoryOrder}
          onMove={(from, to) => dispatch({ type: 'category-moved', from, to })}
        />
      )}
    </form>
  )
}

type Option<T extends string> = { value: T; title: string; description: string }

function Choices<T extends string>(props: {
  legend: string
  name: string
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${fieldLabel} mb-2`}>{props.legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {props.options.map((option) => (
          <label key={option.value} className={choice}>
            <input
              type="radio"
              className="sr-only"
              name={props.name}
              value={option.value}
              checked={props.value === option.value}
              onChange={() => props.onChange(option.value)}
            />
            <span className="text-small font-semibold">{option.title}</span>
            <span className={hint}>{option.description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

type ColumnSelectProps = {
  label: string
  hint?: string
  headers: readonly string[]
  value: number | undefined
} & (
  | { noneLabel: string; onChange: (column: number | undefined) => void }
  | { noneLabel?: undefined; onChange: (column: number) => void }
)

function ColumnSelect(props: ColumnSelectProps) {
  const id = useId()
  const hintId = useId()

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={fieldLabel}>
        {props.label}
      </label>
      {props.hint !== undefined && (
        <p id={hintId} className={`${hint} -mt-1`}>
          {props.hint}
        </p>
      )}
      <select
        id={id}
        className={field}
        value={props.value ?? ''}
        {...(props.hint === undefined ? {} : { 'aria-describedby': hintId })}
        onChange={(event) => {
          const raw = event.currentTarget.value
          if (props.noneLabel === undefined) props.onChange(Number(raw))
          else props.onChange(raw === '' ? undefined : Number(raw))
        }}
      >
        {props.noneLabel !== undefined && <option value="">{props.noneLabel}</option>}
        {props.headers.map((_, column) => (
          <option key={column} value={column}>
            {columnLabel(props.headers, column)}
          </option>
        ))}
      </select>
    </div>
  )
}

function RaterColumns({ headers, mapping, dispatch }: Props & { mapping: WideMapping }) {
  const taken = (column: number) => column === mapping.itemColumn || column === mapping.textColumn
  const free = headers.filter((_, column) => !taken(column)).length
  const chosen = mapping.raterColumns.length

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className={fieldLabel}>Raters</span>
        <span className={`${hint} tabular-nums`}>
          {formatNumber(chosen)} of {counted(free, 'column')}
        </span>
      </legend>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButton}
          onClick={() => dispatch({ type: 'all-rater-columns-chosen' })}
        >
          Select all
        </button>
        <button
          type="button"
          className={secondaryButton}
          onClick={() => dispatch({ type: 'no-rater-columns-chosen' })}
        >
          Select none
        </button>
      </div>
      <div className="grid max-h-96 grid-cols-1 gap-2 overflow-y-auto p-0.5 sm:grid-cols-2">
        {headers.map((_, column) => (
          <label
            key={column}
            className={
              'flex min-h-11 min-w-0 cursor-pointer items-center gap-3 rounded-md border ' +
              'border-rule bg-paper-raised px-3 text-small has-checked:border-accent ' +
              'has-checked:bg-accent-wash has-disabled:cursor-not-allowed ' +
              'has-disabled:bg-paper-sunk has-disabled:text-ink-faint'
            }
          >
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-accent"
              checked={mapping.raterColumns.includes(column)}
              disabled={taken(column)}
              onChange={() => dispatch({ type: 'rater-column-toggled', column })}
            />
            <span className="min-w-0 truncate">{columnLabel(headers, column)}</span>
            {taken(column) && (
              <span className="ml-auto shrink-0 text-caption">
                {column === mapping.itemColumn ? 'item' : 'text'}
              </span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
