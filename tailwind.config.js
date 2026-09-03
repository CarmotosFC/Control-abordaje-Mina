/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0faf4",
          100: "#daf3e3",
          200: "#b6e6c9",
          300: "#85d1a7",
          400: "#4fb480",
          500: "#2c9663",
          600: "#1d7a4f",
          700: "#186241",
          800: "#164e36",
          900: "#12402d",
          950: "#08251a",
        },
        sand: {
          50: "#fbf9f4",
          100: "#f4efe3",
          200: "#e8ddc4",
          900: "#241f14",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(18,24,20,0.06), 0 1px 12px rgba(18,24,20,0.04)",
      },
    },
  },
  plugins: [],
};
