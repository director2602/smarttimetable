import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6f8",
          100: "#d6ebef",
          400: "#2f8fa3",
          600: "#1f6d81",
          700: "#155166",
          900: "#0b2c46"
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
