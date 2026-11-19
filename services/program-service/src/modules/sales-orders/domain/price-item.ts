/** One entry of the internal price list (ADR-0030). No stock: pieces are made on demand. */
export type PriceItemRecord = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  note: string;
  sortOrder: number;
  revision: number;
  updatedAt: Date;
};
