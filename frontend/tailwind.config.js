/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#fff5f5', 100: '#fed7d7', 200: '#feb2b2', 300: '#fc8181', 400: '#f56565', 500: '#e53e3e', 600: '#c53030', 700: '#9b2c2c', 800: '#822727', 900: '#63171b' },
        danger: { 400: '#fc8181', 500: '#e53e3e', 600: '#c53030' },
        safe: { 400: '#68d391', 500: '#48bb78', 600: '#38a169' },
        warn: { 400: '#f6ad55', 500: '#ed8936', 600: '#dd6b20' },
        neutral: { 50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 800: '#262626', 900: '#171717' },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: { from: { transform: 'translateY(20px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
      },
    },
  },
  plugins: [],
};
