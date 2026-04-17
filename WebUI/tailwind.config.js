/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'teal-dark': '#00584E',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
