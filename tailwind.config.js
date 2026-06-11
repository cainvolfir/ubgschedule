/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        cat: {
          body: 'var(--cat-body)',
          dark: 'var(--cat-dark)',
          nose: 'var(--cat-nose)',
          eye: 'var(--cat-eye)',
          white: 'var(--cat-white)',
        },
      },
      animation: {
        'cat-idle': 'cat-idle 0.8s steps(4) infinite',
        'cat-blink': 'cat-blink 3s steps(2) infinite',
        'cat-tail-wag': 'cat-tail-wag 0.4s steps(4) infinite',
        'cat-sleep': 'cat-sleep 2s steps(2) infinite',
        'cat-loading': 'cat-loading 0.3s steps(2) infinite',
        'cat-bob': 'cat-bob 0.6s ease-in-out infinite',
      },
      keyframes: {
        'cat-idle': {
          '0%': { transform: 'translateY(0)' },
          '25%': { transform: 'translateY(-1px)' },
          '50%': { transform: 'translateY(0)' },
          '75%': { transform: 'translateY(-1px)' },
          '100%': { transform: 'translateY(0)' },
        },
        'cat-blink': {
          '0%': { opacity: '1' },
          '50%': { opacity: '1' },
          '52%': { opacity: '0' },
          '54%': { opacity: '1' },
          '100%': { opacity: '1' },
        },
        'cat-tail-wag': {
          '0%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(5deg)' },
          '50%': { transform: 'rotate(0deg)' },
          '75%': { transform: 'rotate(-5deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        'cat-sleep': {
          '0%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(0.97)' },
          '100%': { transform: 'scaleY(1)' },
        },
        'cat-loading': {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
          '100%': { transform: 'translateY(0)' },
        },
        'cat-bob': {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
