/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Cabinet Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        tourflow: {
          bg: '#F4F7F4',
          bgDark: '#0E1512',
          surface: '#FFFFFF',
          surfaceDark: '#1A2420',
          surfaceMuted: '#EAF1EA',
          surfaceMutedDark: '#242E2A',
          primary: '#F05A28',
          primaryHover: '#D94918',
          primarySoft: '#FFF0EA',
          primarySoftDark: '#2A1A12',
          primaryBorder: '#FED7AA',
          primaryBorderDark: '#3D2A1E',
          sage: '#3B6E4A',
          sageLight: '#E8F3EB',
          sageLightDark: '#1E2E24',
          sageBorder: '#C6DEC9',
          sageBorderDark: '#2E4034',
          dark: '#142018',
          darkDark: '#F0F5F2',
          textMuted: '#5C6E61',
          textMutedDark: '#8A9E91',
          cardBorder: '#E1ECE3',
          cardBorderDark: '#2A3530',
        },
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(20, 32, 24, 0.05), 0 2px 6px -1px rgba(20, 32, 24, 0.03)',
        card: '0 8px 30px rgba(20, 32, 24, 0.06)',
        float: '0 14px 40px -4px rgba(240, 90, 40, 0.22)',
        sheet: '0 -8px 40px rgba(20, 32, 24, 0.16)',
      },
    },
  },
  plugins: [],
};
