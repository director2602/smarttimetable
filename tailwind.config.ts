import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f6eef8",
          100: "#e9d3ee",
          400: "#7a3d89",
          500: "#5a1b69",
          600: "#400C4D",
          700: "#330a3d",
          900: "#1f0625"
        },
        accent: {
          500: "#e08a2c",
          600: "#c87418"
        }
      }
    }
  },
  plugins: []
};
export default config;
