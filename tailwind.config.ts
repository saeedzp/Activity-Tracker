import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font-app)", "system-ui", "sans-serif"] },
      colors: {
        brand: { DEFAULT: "#0f766e", dark: "#115e59", light: "#ccfbf1" },
      },
    },
  },
  plugins: [],
} satisfies Config;
