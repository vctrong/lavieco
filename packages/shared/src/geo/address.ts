import { z } from "zod";

import { VN_PROVINCES, type VnProvinceEntry, type VnWardEntry } from "./vn-admin-units.data";

/**
 * Two-level Vietnamese address (province → ward/commune, since 1 July 2025) plus a free
 * detail line (house number, street, "cổng trường 3h chiều"...). Names are snapshotted
 * next to the codes so an order keeps reading the same even if the list changes.
 */
export const ADDRESS_LIMITS = { detailMax: 200 } as const;

const provinceByCode = new Map<number, VnProvinceEntry>(VN_PROVINCES.map((p) => [p.code, p]));
const wardsByProvince = new Map<number, Map<number, string>>(
  VN_PROVINCES.map((p) => [p.code, new Map(p.wards.map(([code, name]) => [code, name]))]),
);

export const findProvince = (code: number): VnProvinceEntry | null =>
  provinceByCode.get(code) ?? null;

export const wardsOf = (provinceCode: number): readonly VnWardEntry[] =>
  provinceByCode.get(provinceCode)?.wards ?? [];

export function findWard(provinceCode: number, wardCode: number): string | null {
  return wardsByProvince.get(provinceCode)?.get(wardCode) ?? null;
}

/** What a form sends. `provinceCode: null` means "Khác" (staff forms only). */
export const addressInputSchema = z
  .object({
    provinceCode: z.number().int().positive().nullable(),
    wardCode: z.number().int().positive().nullable(),
    detail: z.string().trim().max(ADDRESS_LIMITS.detailMax).default(""),
  })
  .superRefine((value, ctx) => {
    if (value.provinceCode === null) {
      if (value.wardCode !== null)
        ctx.addIssue({ code: "custom", path: ["wardCode"], message: "No ward without province" });
      return;
    }
    if (!findProvince(value.provinceCode)) {
      ctx.addIssue({ code: "custom", path: ["provinceCode"], message: "Unknown province" });
      return;
    }
    if (value.wardCode === null || !findWard(value.provinceCode, value.wardCode))
      ctx.addIssue({ code: "custom", path: ["wardCode"], message: "Unknown ward" });
  });
export type AddressInput = z.infer<typeof addressInputSchema>;

/** Stored and returned shape: codes, names at the time, and the joined line. */
export const addressSchema = z.object({
  provinceCode: z.number().int().nullable(),
  provinceName: z.string(),
  wardCode: z.number().int().nullable(),
  wardName: z.string(),
  detail: z.string(),
  /** `detail, ward, province`; only `detail` for "Khác". */
  full: z.string(),
});
export type Address = z.infer<typeof addressSchema>;

export function joinAddress(parts: { detail: string; wardName: string; provinceName: string }) {
  return [parts.detail, parts.wardName, parts.provinceName].filter((part) => part).join(", ");
}

/** Resolves the names of a validated input. Throws if the codes are not in the list. */
export function resolveAddress(input: AddressInput): Address {
  const detail = input.detail.trim();
  if (input.provinceCode === null) {
    return {
      provinceCode: null,
      provinceName: "",
      wardCode: null,
      wardName: "",
      detail,
      full: detail,
    };
  }
  const province = findProvince(input.provinceCode);
  const wardName = input.wardCode === null ? null : findWard(input.provinceCode, input.wardCode);
  if (!province || wardName === null) throw new Error("address.invalid");
  return {
    provinceCode: province.code,
    provinceName: province.name,
    wardCode: input.wardCode,
    wardName,
    detail,
    full: joinAddress({ detail, wardName, provinceName: province.name }),
  };
}
