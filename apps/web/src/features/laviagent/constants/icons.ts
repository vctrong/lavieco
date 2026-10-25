import { FiAnchor, FiCoffee, FiDisc, FiDroplet, FiPackage } from "react-icons/fi";

import type { Material } from "../types";

/** materials.json names a Feather icon; this is the only place that maps it to a component. */
export const MATERIAL_ICONS: Record<Material["icon"], typeof FiDroplet> = {
  droplet: FiDroplet,
  disc: FiDisc,
  package: FiPackage,
  coffee: FiCoffee,
  anchor: FiAnchor,
};
