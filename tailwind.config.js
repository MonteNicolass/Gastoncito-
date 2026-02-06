/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm zinc override — transforms the entire app from cold to warm
        zinc: {
          50:  '#F6F1EB',
          100: '#ECE5DC',
          200: '#DDD4C8',
          300: '#C5B9AB',
          400: '#9C8F80',
          500: '#786C60',
          600: '#5C5248',
          700: '#433B33',
          800: '#2A2520',
          900: '#1C1916',
          950: '#110F0D',
        },
        brand: {
          50:  '#FBF4EF',
          100: '#F5E4D8',
          200: '#EACAB3',
          300: '#DCA985',
          400: '#CF8A5E',
          500: '#B85C38',
          600: '#A14B2D',
          700: '#863C24',
          800: '#6E3222',
          900: '#5B2B1F',
          950: '#331410',
        },
        terra: {
          50:  '#FBF4EF',
          100: '#F5E4D8',
          200: '#EACAB3',
          300: '#DCA985',
          400: '#CF8A5E',
          500: '#B85C38',
          600: '#A14B2D',
          700: '#863C24',
          800: '#6E3222',
          900: '#5B2B1F',
          950: '#331410',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'Times New Roman', 'serif'],
        body:    ['var(--font-body)', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['var(--font-mono)', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
