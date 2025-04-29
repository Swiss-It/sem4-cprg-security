// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Add paths to all of your template files where you use Tailwind classes
    "./src/**/*.{js,ts,jsx,tsx,html}",
    "./public/index.html",
    // etc.
  ],
  theme: {
    extend: {
      // Add your custom colors here
      colors: {
        'text': '#242424',
        'background': '#fffcf5',
        'primary': '#bcad86',
        'secondary': '#151515',
        'accent': '#95d49b',
        },

      // You can extend other theme properties here too (fonts, spacing, etc.)
    },
  },
  plugins: [],
};