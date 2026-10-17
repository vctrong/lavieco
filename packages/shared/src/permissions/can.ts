import type { Permission } from "./permission";
import { permissionsForRoles, type Role } from "./roles";

type HasRoles = { roles: readonly Role[] };

/**
 * Whether a staff member holds a permission. In `admin` this only hides controls
 * (UX); the services enforce permissions themselves (docs/02 §9.3).
 */
export function can(user: HasRoles | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return permissionsForRoles(user.roles).includes(permission);
}
