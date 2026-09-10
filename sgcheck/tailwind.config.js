/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border, 217.2 32.6% 17.5%))",
        input: "hsl(var(--input, 217.2 32.6% 17.5%))",
        ring: "hsl(var(--ring, 43 96% 56%))",
        background: "hsl(var(--background, 222.2 84% 4.9%))",
        foreground: "hsl(var(--foreground, 210 40% 98%))",
        primary: {
          DEFAULT: "hsl(var(--primary, 43 96% 56%))",
          foreground: "hsl(var(--primary-foreground, 222.2 47.4% 11.2%))",
        },
      },
      fontFamily: {
        heading: ["GROBOLD", "sans-serif"],
        body: ["ClashDisplay", "sans-serif"],
      },
    },
  },
  plugins: [],
}
