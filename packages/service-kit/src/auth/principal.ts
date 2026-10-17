import type { Permission, Role } from "@lavieco/shared/permissions";
import type { ServiceName } from "@lavieco/shared";

/** Who is calling, established by the access guard from the bearer token. */
export type Principal =
  | {
      kind: "staff";
      userId: string;
      sessionId: string;
      roles: Role[];
      permissions: Permission[];
    }
  | { kind: "member"; userId: string; sessionId: string }
  | { kind: "service"; name: ServiceName };

export type StaffPrincipal = Extract<Principal, { kind: "staff" }>;
export type MemberPrincipal = Extract<Principal, { kind: "member" }>;
export type ServicePrincipal = Extract<Principal, { kind: "service" }>;
