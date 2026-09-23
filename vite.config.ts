import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Node only. Pure modules are tested and components are not (SPEC.md), so
    // nothing under test touches the DOM.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
