import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mirrors the mockup's dark theme tokens.
        bg: "#0d1117",
        panel: "#161b22",
        "panel-2": "#1c2330",
        border: "#2a3340",
        text: "#e6edf3",
        muted: "#9aa7b4",
        accent: "#58a6ff",
        teal: "#2a7a74",
      },
    },
  },
  plugins: [],
};

export default config;
