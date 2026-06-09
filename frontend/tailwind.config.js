/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  darkMode: 'class', // toggled by adding/removing 'dark' class on <html>
  theme: {
    extend: {
      colors: {
        // CompassionEdu brand palette — warm, approachable
        brand: {
          50:  '#fdf6ee',
          100: '#faebd7',
          200: '#f5d5a8',
          300: '#efba72',
          400: '#e89a3c',
          500: '#d97706', // primary amber
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
        },
        compassion: {
          teal:   '#0d9488',
          coral:  '#f87171',
          sage:   '#6b7280',
          cream:  '#fdf6ee',
          charcoal: '#1f2937',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      screens: {
        xs: '320px',
      },
    },
  },
  plugins: [],
};
