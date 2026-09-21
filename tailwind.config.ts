import type { Config } from "tailwindcss";

// 由 globals.css 的 CSS 变量驱动，随主题切换
const themed = (name: string, shades: number[]) =>
  Object.fromEntries(shades.map((shade) => [shade, `rgb(var(--${name}-${shade}) / <alpha-value>)`]));

const config: Config = {
  darkMode: "class",
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
        zinc: themed("zinc", [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        emerald: themed("emerald", [300, 400]),
        amber: themed("amber", [300, 400]),
        blue: themed("blue", [300, 400]),
        red: themed("red", [300, 400]),
        cyan: themed("cyan", [300, 400]),
        indigo: themed("indigo", [400]),
        orange: themed("orange", [400]),
        purple: themed("purple", [400]),
        rose: themed("rose", [400]),
        teal: themed("teal", [400]),
        tesla: {
          red: "#E82127",
          dark: "#171A20",
          card: "#1E2024",
          cardHover: "#26292E",
          border: "#2F333B",
          blue: "#3E6AE1",
          green: "#10B981",
        },
      },
    },
  },
  plugins: [],
};
export default config;
