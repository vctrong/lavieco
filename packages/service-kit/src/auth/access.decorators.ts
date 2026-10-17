import {
  applyDecorators,
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import type { Request } from "express";

import type { ServiceName } from "@lavieco/shared";
import type { Permission } from "@lavieco/shared/permissions";

import type { Principal } from "./principal";

export const ACCESS_RULE = "lavieco:access-rule";

/**
 * How an endpoint may be reached. Every route declares exactly one rule; a route
 * without one is refused by the guard (S4, deny by default). ADR-0018.
 */
export type AccessRule =
  | { kind: "permission"; permissions: readonly Permission[] }
  | { kind: "member" }
  | { kind: "service"; callers: readonly ServiceName[] }
  | { kind: "public" };

/** Staff access token holding ALL the listed permissions (never checks role names). */
export const RequirePermission = (...permissions: [Permission, ...Permission[]]) =>
  applyDecorators(
    SetMetadata(ACCESS_RULE, { kind: "permission", permissions } satisfies AccessRule),
    ApiBearerAuth(),
  );

/** Any valid staff access token, no specific permission (e.g. reading one's own profile). */
export const RequireStaff = () =>
  applyDecorators(
    SetMetadata(ACCESS_RULE, { kind: "permission", permissions: [] } satisfies AccessRule),
    ApiBearerAuth(),
  );

/** Member access token; the handler must still scope data to `principal.userId` (IDOR). */
export const RequireMember = () =>
  applyDecorators(
    SetMetadata(ACCESS_RULE, { kind: "member" } satisfies AccessRule),
    ApiBearerAuth(),
  );

/**
 * Service token from one of the listed callers, e.g. the `web` BFF calling on behalf
 * of an anonymous visitor (docs/02 §6.3). Carries no user identity.
 */
export const AllowServices = (...callers: [ServiceName, ...ServiceName[]]) =>
  applyDecorators(
    SetMetadata(ACCESS_RULE, { kind: "service", callers } satisfies AccessRule),
    ApiBearerAuth(),
  );

/** No token at all. Only for health and JWKS, which live on the private network. */
export const PublicEndpoint = () =>
  SetMetadata(ACCESS_RULE, { kind: "public" } satisfies AccessRule);

export type RequestWithPrincipal = Request & { principal?: Principal };

/** Injects the principal set by the guard. */
export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    return context.switchToHttp().getRequest<RequestWithPrincipal>().principal;
  },
);
