import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { Logger } from "@lavieco/observability";
import { DomainError } from "@lavieco/shared";

import { LOGGER } from "../logging/logging.module";
import { ACCESS_RULE, type AccessRule, type RequestWithPrincipal } from "./access.decorators";
import { TokenVerifier } from "./token-verifier";

export const TOKEN_VERIFIER = Symbol("TOKEN_VERIFIER");

/**
 * Global guard. Reads the route's access rule, verifies the bearer token and sets
 * `request.principal`. No rule ⇒ refused: forgetting a decorator fails closed (S4).
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rule = this.reflector.getAllAndOverride<AccessRule | undefined>(ACCESS_RULE, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();

    if (!rule) {
      this.logger.error("route without access rule refused", { path: request.path });
      throw new DomainError("common.forbidden");
    }
    if (rule.kind === "public") return true;

    const token = bearerToken(request.headers.authorization);
    if (!token) throw new DomainError("common.unauthenticated");

    switch (rule.kind) {
      case "service":
        request.principal = await this.verifier.verifyService(token, rule.callers);
        return true;
      case "member":
        request.principal = await this.verifier.verifyMember(token);
        return true;
      case "permission": {
        const principal = await this.verifier.verifyStaff(token);
        const missing = rule.permissions.filter((p) => !principal.permissions.includes(p));
        if (missing.length > 0) throw new DomainError("common.forbidden");
        request.principal = principal;
        return true;
      }
    }
  }
}

function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && value ? value : null;
}
