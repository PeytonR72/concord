import type { Dataset } from '../dataset/dataset'
import csv from '../../public/demo/support-messages.csv?raw'
import { demoDataset } from './demo-dataset'

// Test-only: the committed demo CSV, read through Vite's ?raw import since the
// app's tsconfig has no Node types, and the Dataset it maps to.
export const demoCsv = csv

export function demo(): Dataset {
  const result = demoDataset(demoCsv)
  if (!result.ok) throw new Error(result.error)
  return result.value
}
