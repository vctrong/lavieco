import type { ComponentType } from "react";
import { FiCoffee, FiDisc, FiDroplet, FiPackage } from "react-icons/fi";

import { ShellIcon } from "@/shared/components/illustrations/shell-icon";

import type { Material } from "../types";

export type MaterialIconProps = {
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

/** materials.json names an icon; this is the only place that maps it to a component. */
export const MATERIAL_ICONS: Record<Material["icon"], ComponentType<MaterialIconProps>> = {
  droplet: FiDroplet,
  disc: FiDisc,
  package: FiPackage,
  coffee: FiCoffee,
  // Feather has no shell: our own icon on Feather's grid and stroke.
  shell: ShellIcon,
};
