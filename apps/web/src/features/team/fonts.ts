import { Playwrite_VN } from "next/font/google";

/**
 * Handwriting face for the margin notes. Chosen among Playwrite VN, Dancing Script and
 * Patrick Hand: the first one that renders every Vietnamese test glyph correctly
 * (Caveat has no Vietnamese subset and breaks tone marks). It publishes no subsets, so
 * Next does not preload it.
 */
export const handwriting = Playwrite_VN({
  weight: "400",
  display: "swap",
  variable: "--font-handwriting-face",
});
