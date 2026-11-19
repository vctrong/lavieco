export {
  ADDRESS_LIMITS,
  addressInputSchema,
  addressSchema,
  findProvince,
  findWard,
  joinAddress,
  resolveAddress,
  wardsOf,
  type Address,
  type AddressInput,
} from "./address";
export { VN_PROVINCES, type VnProvinceEntry, type VnWardEntry } from "./vn-admin-units.data";

/**
 * Wards that used to make up Ninh Kiều district (Cần Thơ), the default free delivery
 * zone of the shop settings. Staff can change the list in the admin.
 */
export const DEFAULT_FREE_SHIPPING_WARD_CODES: readonly number[] = [31120, 31135, 31147, 31150];
