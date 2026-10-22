import {
  FiAward,
  FiBookOpen,
  FiCamera,
  FiCoffee,
  FiFeather,
  FiGift,
  FiHeart,
  FiPackage,
  FiTool,
  FiUsers,
} from "react-icons/fi";

import type { BenefitIcon } from "@lavieco/shared/events";

/**
 * Stored "Bạn sẽ nhận" keys → Feather icons, same mapping as `apps/web`. Data never
 * names an icon library; each app maps the shared keys itself.
 */
export const BENEFIT_ICON_COMPONENTS: Record<BenefitIcon, typeof FiAward> = {
  leaf: FiFeather,
  gift: FiGift,
  award: FiAward,
  camera: FiCamera,
  book: FiBookOpen,
  package: FiPackage,
  users: FiUsers,
  coffee: FiCoffee,
  heart: FiHeart,
  tool: FiTool,
};
