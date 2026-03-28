import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        crimson: {
          DEFAULT: "#C41E3A",
          50: "#fdf2f4",
          100: "#fce7eb",
          200: "#f9d0d8",
          300: "#f4a8b8",
          400: "#ec7590",
          500: "#e04470",
          600: "#c41e3a",
          700: "#a81832",
          800: "#8c162d",
          900: "#78162b",
        },
        navy: {
          DEFAULT: "#0F172A",
          800: "#1e293b",
          700: "#334155",
        },
      },
    },
  },
  plugins: [],
};
export default config;
