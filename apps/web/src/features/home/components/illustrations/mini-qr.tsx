import { cn } from "@lavieco/ui";

type MiniQrProps = {
  /** Accessible name; omit when the graphic is purely decorative. */
  label?: string;
  className?: string;
};

/** Illustrative QR glyph for story cards. Not a scannable code. */
export function MiniQr({ label, className }: MiniQrProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-full", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-5 0h2v3h-2v-3zm2 3h3v2h-3v-2zm3 2h3v4h-3v-4zm-5 2h2v2h-2v-2z" />
    </svg>
  );
}
