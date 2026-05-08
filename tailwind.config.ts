import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  prefix: "smd-",
  theme: {
    extend: {}
  },
  plugins: []
} satisfies Config;
