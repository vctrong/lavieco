import { cn } from "../lib/cn";

type NestedShapesProps = {
  shape: "ellipse" | "rect";
  className?: string;
};

/** Nested ellipses or rounded rectangles, centered. Decorative. */
export function NestedShapes({ shape, className }: NestedShapesProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      {shape === "ellipse" ? (
        <>
          <ellipse cx="50%" cy="50%" rx="90" ry="140" />
          <ellipse cx="50%" cy="50%" rx="60" ry="100" />
          <ellipse cx="50%" cy="50%" rx="30" ry="50" />
        </>
      ) : (
        <>
          <rect x="15%" y="12%" width="70%" height="76%" rx="16" />
          <rect x="25%" y="22%" width="50%" height="56%" rx="12" />
          <rect x="35%" y="32%" width="30%" height="36%" rx="8" />
        </>
      )}
    </svg>
  );
}
