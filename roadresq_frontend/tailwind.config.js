/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep navy/charcoal for dashboard surfaces and text
        ink: {
          50: '#F4F6FA',
          100: '#E7EAF1',
          200: '#CDD3DF',
          300: '#A3ACBF',
          400: '#717C95',
          500: '#4D5873',
          600: '#343E57',
          700: '#232C42',
          800: '#161E31',
          900: '#0E1525',
          950: '#080D19',
        },
        // Signal orange: assistance alerts and primary actions
        signal: {
          50: '#FFF5EE',
          100: '#FFE7D6',
          200: '#FFCBA8',
          300: '#FFA670',
          400: '#FF8540',
          500: '#FF6A1A',
          600: '#EB5409',
          700: '#C2410A',
        },
        // Electric lime: success, live, online
        volt: {
          50: '#F8FDE8',
          100: '#EEFBC6',
          200: '#DDF68E',
          300: '#C9EE4E',
          400: '#B5E31F',
          500: '#98C70E',
          600: '#759C07',
          700: '#58760B',
        },
        canvas: '#F4F5F8',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(14, 21, 37, 0.04), 0 6px 20px -8px rgba(14, 21, 37, 0.10)',
        lift: '0 2px 4px rgba(14, 21, 37, 0.06), 0 16px 32px -12px rgba(14, 21, 37, 0.22)',
        signal: '0 8px 24px -8px rgba(255, 106, 26, 0.55)',
        volt: '0 0 0 4px rgba(181, 227, 31, 0.18)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      keyframes: {
        'page-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'none' },
        },
        pop: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '60%': { transform: 'scale(1.01)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        ping: { '75%, 100%': { transform: 'scale(2.2)', opacity: '0' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'typing-dot': {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-3px)', opacity: '1' },
        },
        dash: { to: { strokeDashoffset: '-40' } },
        'new-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(255,106,26,0.45)' },
          '100%': { boxShadow: '0 0 0 12px rgba(255,106,26,0)' },
        },
      },
      animation: {
        // 'backwards' (not 'both'): no transform is left on <main>, which would break position:fixed children
        'page-in': 'page-in 280ms cubic-bezier(.2,.8,.2,1) backwards',
        'fade-in': 'fade-in 200ms ease-out both',
        'slide-up': 'slide-up 320ms cubic-bezier(.2,.8,.2,1) both',
        'slide-down': 'slide-down 220ms cubic-bezier(.2,.8,.2,1) both',
        pop: 'pop 260ms cubic-bezier(.2,.8,.2,1) both',
        ping: 'ping 1.6s cubic-bezier(0,0,.2,1) infinite',
        shimmer: 'shimmer 1.4s infinite',
        'typing-dot': 'typing-dot 1.2s infinite',
        dash: 'dash 1.6s linear infinite',
        'new-ring': 'new-ring 1.2s ease-out 3',
      },
    },
  },
  plugins: [],
};
