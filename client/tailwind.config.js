/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FFFBF0',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        ivory: {
          50: '#FFFCF8',
          100: '#FDF7EC',
          200: '#F9F0DF',
          300: '#EFE1C6',
          400: '#E3CBA8',
          500: '#CCA97C',
        },
        charcoal: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
        },
        emerald: {
          800: '#064E3B',
          900: '#022C22',
        },
        burgundy: {
          500: '#9F1239',
          600: '#881337',
          700: '#4C0519',
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 4px 20px -2px rgba(245, 158, 11, 0.40)',
        'luxury': '0 10px 30px -5px rgba(24, 24, 27, 0.08), 0 20px 25px -5px rgba(245, 158, 11, 0.15)',
      }
    },
  },
  plugins: [],
}
