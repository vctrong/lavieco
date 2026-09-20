"use client";

import dynamic from "next/dynamic";

// Loaded after the main content; it never renders on the server.
const PearlCursor = dynamic(() => import("./pearl-cursor").then((mod) => mod.PearlCursor), {
  ssr: false,
});

export function PearlCursorLoader() {
  return <PearlCursor />;
}
