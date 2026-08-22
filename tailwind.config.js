/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#FFD13B",
        secondary: "#FF90E8",
        tertiary: "#3B82F6",
        background: "#EFF6FF",
        surface: "#FFFFFF",
        success: "#10B981",
        warning: "#FFD13B",
        error: "#F43F5E",
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      borderWidth: {
        '3': '3px',
      },
      boxShadow: {
        'brutal-sm': '2px 2px 0px #000000',
        'brutal': '4px 4px 0px #000000',
        'brutal-lg': '6px 6px 0px #000000',
        'brutal-xl': '8px 8px 0px #000000',
      },
    },
  },
  plugins: [],
}
