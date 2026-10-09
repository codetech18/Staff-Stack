/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f7f8fa',
        surface: '#ffffff',
        surface2: '#f6f8f7',
        line: '#e8ece9',
        line2: '#d9e1dc',
        accent: '#216449',
        'accent-dim': '#eaf3ed',
        ok: '#25845c',
        warn: '#ac7620',
        danger: '#c95252',
        ink: '#243b32',
        mut: '#7a8780',
        mut2: '#586b61',
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
