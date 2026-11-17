import type { ShopSettingsInput } from "@lavieco/shared/shop";

export type CategoryRecord = {
  id: string;
  key: string;
  name: string;
  description: string;
  sortOrder: number;
  archivedAt: Date | null;
  revision: number;
};

export type BrandRecord = {
  id: string;
  slug: string;
  name: string;
  story: string;
  website: string;
  logo: { mediaId: string; publicId: string; width: number; height: number; alt: string } | null;
  /** ‰; admin only (BR-25). */
  commissionRate: number;
  active: boolean;
  revision: number;
};

export type ShopSettingsRecord = ShopSettingsInput & { revision: number };

export type StockMovementRecord = {
  id: string;
  variantId: string;
  productId: string;
  type: "receive" | "adjust" | "sell" | "return" | "import";
  delta: number;
  reason: string;
  orderId: string | null;
  importJobId: string | null;
  actorId: string | null;
  at: Date;
};
