/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0b0d',
        surface: '#111318',
        surface2: '#171b22',
        line: '#1e2330',
        line2: '#252d3d',
        accent: '#3b82f6',
        'accent-dim': '#1d3a6e',
        ok: '#22c55e',
        warn: '#f59e0b',
        danger: '#ef4444',
        ink: '#e2e8f0',
        mut: '#64748b',
        mut2: '#94a3b8',
      },
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
