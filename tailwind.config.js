/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#F4F6F4", 100: "#E7EBE8", 200: "#CBD4CD", 300: "#A6B4AA", 400: "#7B8C80",
          500: "#5A6C5F", 600: "#46564B", 700: "#37453C", 800: "#26332B", 900: "#18241D", 950: "#0E1712",
        },
        cream: { 50: "#FDFBF6", 100: "#FAF6EC", 200: "#F4EDDD", 300: "#EDE3CE", 400: "#E0D2B5" },
        rose: {
          50: "#FCF2F3", 100: "#F8E1E4", 200: "#F0C4CA", 300: "#E29BA5", 400: "#D06E7C",
          500: "#BC4F61", 600: "#A53C4E", 700: "#883141", 800: "#712B38", 900: "#602733",
        },
        leaf: { 50: "#EFF6F1", 100: "#DAEADF", 200: "#B9D6C3", 500: "#357A58", 600: "#2B6548", 700: "#24523B" },
        brass: { 50: "#FBF6E8", 100: "#F5E9C8", 300: "#E4CB85", 500: "#C9A227", 600: "#A9861B" },
        clay: { 50: "#FDF0EE", 100: "#FADCD9", 500: "#B3261E", 600: "#971E17" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(24,36,29,0.04), 0 10px 26px -18px rgba(24,36,29,0.28)",
        lift: "0 2px 4px rgba(24,36,29,0.05), 0 22px 44px -20px rgba(24,36,29,0.30)",
      },
    },
  },
  plugins: [],
};
