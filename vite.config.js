import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      canvas: path.resolve('./src/lib/canvas-stub.js'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Only discover tests in src/ and netlify/ — ignore .claude/worktrees/ etc.
    include: ['src/**/*.test.{js,jsx,ts,tsx}', 'netlify/**/*.test.{js,jsx}'],
    exclude: ['node_modules/**', '.claude/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}', 'netlify/functions/**/*.js'],
      exclude: [
        'src/test/**',
        'src/**/*.test.{js,jsx}',
        'src/main.jsx',       // entry point, nothing to unit test
        'src/lib/canvas-stub.js',
      ],
    },
  },
})
