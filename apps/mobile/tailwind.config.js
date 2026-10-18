/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Warm sand palette — matches web's OKLCH design tokens
        sand: '#F8F7F3',
        foam: '#FAFAF8',
        line: '#E5E3DE',
        ink: {
          DEFAULT: '#1C1B2A',
          soft: '#696680',
          muted: '#8A8799',
        },
        lagoon: {
          DEFAULT: '#4A8DB8',
          deep: '#3566A0',
        },
        // Primary button — web's `--primary: oklch(0.4 0.13 258)`
        brand: '#344BA0',
        // Status colors — matches web's getDateStatus palette
        status: {
          overdue: '#E05454',
          today: '#D97706',
          soon: '#4A8DB8',
          future: '#8A8799',
        },
      },
    },
  },
}
