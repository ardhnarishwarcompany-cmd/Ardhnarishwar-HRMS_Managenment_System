/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        magenta: {
          50: "#fdf4ff",
          100: "#fae8ff",
          200: "#f5d0fe",
          400: "#e879f9",
          500: "#d946ef",
          600: "#c026d3",
          700: "#a21caf",
        },
      },
      boxShadow: {
        card: "0 10px 30px -14px rgba(76, 29, 149, 0.18)",
        float: "0 18px 50px -20px rgba(76, 29, 149, 0.28)",
        brand: "0 12px 28px -10px rgba(124, 58, 237, 0.55)",
        tile: "0 14px 30px -14px rgba(15, 23, 42, 0.35)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #6d28d9 0%, #7c3aed 38%, #a21caf 74%, #d946ef 100%)",
        "page-gradient":
          "linear-gradient(135deg, #eef0fc 0%, #f4eefb 48%, #fcedf4 100%)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
}
