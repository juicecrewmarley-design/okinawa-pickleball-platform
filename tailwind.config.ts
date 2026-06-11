import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: "#effcff",
          100: "#d7f6fb",
          500: "#0aa7c2",
          700: "#087d93"
        },
        coral: {
          100: "#fff0e5",
          500: "#ff8a3d",
          600: "#ec6f1f"
        },
        hibiscus: "#e84a6a",
        palm: {
          100: "#eaf8ea",
          500: "#21a76b",
          700: "#14794f"
        },
        ink: "#16313b"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(22, 49, 59, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
