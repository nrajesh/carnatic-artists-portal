import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
      },
      maxWidth: {
        /** ~65-70 characters for body text (WCAG readability guidance). */
        measure: "65ch",
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            maxWidth: "65ch",
            lineHeight: "1.75",
            p: {
              marginTop: "0.75em",
              marginBottom: "0.75em",
            },
            /** Shift+Enter `<br>` inside one `<p>` - modest gap, not a full paragraph. */
            "p br:not(:last-child)": {
              display: "block",
              marginBottom: "0.65em",
            },
            li: {
              marginTop: "0.35em",
              marginBottom: "0.35em",
            },
            a: {
              color: theme("colors.amber.800"),
              textDecorationThickness: "from-font",
              textUnderlineOffset: "0.2em",
              fontWeight: "500",
              "&:hover": {
                color: theme("colors.amber.900"),
              },
            },
            strong: {
              fontWeight: "600",
              color: theme("colors.stone.900"),
            },
          },
        },
        stone: {
          css: {
            "--tw-prose-body": theme("colors.stone.800"),
            "--tw-prose-headings": theme("colors.stone.900"),
            "--tw-prose-bold": theme("colors.stone.900"),
          },
        },
      }),
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [typography],
};
export default config;
