import { Be_Vietnam_Pro, Fraunces } from "next/font/google";

/** next/font is configured once so the root layout and `global-error` load identical faces. */
const fraunces = Fraunces({
  subsets: ["latin", "vietnamese"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-fraunces",
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

export const FONT_VARIABLE_CLASSES = `${fraunces.variable} ${beVietnamPro.variable}`;
