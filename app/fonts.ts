import { Fraunces, Inter } from "next/font/google";

/** UI / body: neutral grotesk for dense copy, forms, and bios (screen-optimised). */
export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/**
 * Display / headings: soft serif with character; keep for titles only so long bios stay easy to read on mobile.
 */
export const fontDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
