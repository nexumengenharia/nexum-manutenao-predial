import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marinho: { 50:"#f1f5f9",100:"#e2e8f0",600:"#1e3a5f",700:"#17304f",800:"#12253c",900:"#0d1b2c" },
        institucional: { 500:"#b8860b", 600:"#9a7209" },
      },
      fontFamily: { sans: ["ui-sans-serif","system-ui","Segoe UI","Roboto","Helvetica Neue","Arial","sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
