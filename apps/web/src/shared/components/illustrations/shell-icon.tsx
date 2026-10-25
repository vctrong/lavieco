import type { SVGProps } from "react";

type ShellIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number | string };

/**
 * A scallop shell drawn on Feather's grid (24 × 24, 2px round stroke, no fill), so it
 * sits next to `react-icons/fi` icons without looking foreign. Feather has no shell.
 */
export function ShellIcon({ size = 24, ...props }: ShellIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 19.5 4 10.2C3.6 6.3 7.3 3 12 3s8.4 3.3 8 7.2Z" />
      <path d="M12 19.5 8.2 4" />
      <path d="M12 19.5V3" />
      <path d="M12 19.5 15.8 4" />
      <path d="M9.5 21.5h5" />
    </svg>
  );
}
