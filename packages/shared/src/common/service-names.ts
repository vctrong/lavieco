/**
 * Names of the deployed components. A service token carries the caller in `iss` and
 * the target service in `aud` (docs/02 §6.3), so these strings are part of the contract.
 */
export const SERVICE_NAMES = [
  "web",
  "admin",
  "identity-service",
  "content-service",
  "lead-service",
  "program-service",
] as const;

export type ServiceName = (typeof SERVICE_NAMES)[number];

export function isServiceName(value: unknown): value is ServiceName {
  return typeof value === "string" && (SERVICE_NAMES as readonly string[]).includes(value);
}
