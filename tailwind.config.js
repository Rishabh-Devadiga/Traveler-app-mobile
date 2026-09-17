/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Cabinet Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        tourflow: {
          bg: '#F4F7F4',
          surface: '#FFFFFF',
          surfaceMuted: '#EAF1EA',
          primary: '#F05A28',
          primaryHover: '#D94918',
          primarySoft: '#FFF0EA',
          primaryBorder: '#FED7AA',
          sage: '#3B6E4A',
          sageLight: '#E8F3EB',
          sageBorder: '#C6DEC9',
          dark: '#142018',
          textMuted: '#5C6E61',
          cardBorder: '#E1ECE3',
        },
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(20, 32, 24, 0.05), 0 2px 6px -1px rgba(20, 32, 24, 0.03)',
        card: '0 8px 30px rgba(20, 32, 24, 0.06)',
        float: '0 14px 40px -4px rgba(240, 90, 40, 0.22)',
      },
    },
  },
  plugins: [],
};
