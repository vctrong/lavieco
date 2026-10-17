import {
  createRemoteJWKSet,
  decodeJwt,
  importJWK,
  jwtVerify,
  type JWK,
  type JWTVerifyGetKey,
  type KeyLike,
} from "jose";

import { DomainError, isServiceName, type ServiceName } from "@lavieco/shared";
import {
  IDENTITY_ISSUER,
  TOKEN_AUDIENCES,
  memberAccessClaimsSchema,
  staffAccessClaimsSchema,
} from "@lavieco/shared/identity";
import { permissionsForRoles } from "@lavieco/shared/permissions";

import type { MemberPrincipal, ServicePrincipal, StaffPrincipal } from "./principal";

export type TokenVerifierOptions = {
  /** This service's name: the expected `aud` of incoming service tokens. */
  serviceName: ServiceName;
  /** Resolves identity-service signing keys: its JWKS URL, or a local resolver inside identity. */
  userKeys: { jwksUrl: string } | { resolver: JWTVerifyGetKey };
  /** Public Ed25519 JWK of every caller allowed to present a service token. */
  trustedServiceKeys: Partial<Record<ServiceName, JWK>>;
};

const ALGORITHMS = ["EdDSA"];
const CLOCK_TOLERANCE_SECONDS = 5;

/** Verifies the three kinds of bearer tokens (docs/02 §6.3, §9.2). */
export class TokenVerifier {
  private readonly userKeys: JWTVerifyGetKey;
  private readonly serviceKeys = new Map<ServiceName, Promise<KeyLike | Uint8Array>>();

  constructor(private readonly options: TokenVerifierOptions) {
    this.userKeys =
      "jwksUrl" in options.userKeys
        ? createRemoteJWKSet(new URL(options.userKeys.jwksUrl), { cooldownDuration: 30_000 })
        : options.userKeys.resolver;
  }

  async verifyStaff(token: string): Promise<StaffPrincipal> {
    const payload = await this.verifyUser(token, TOKEN_AUDIENCES.staff);
    const claims = staffAccessClaimsSchema.safeParse(payload);
    if (!claims.success) throw new DomainError("common.unauthenticated");
    return {
      kind: "staff",
      userId: claims.data.sub,
      sessionId: claims.data.sid,
      roles: claims.data.roles,
      permissions: permissionsForRoles(claims.data.roles),
    };
  }

  async verifyMember(token: string): Promise<MemberPrincipal> {
    const payload = await this.verifyUser(token, TOKEN_AUDIENCES.member);
    const claims = memberAccessClaimsSchema.safeParse(payload);
    if (!claims.success) throw new DomainError("common.unauthenticated");
    return { kind: "member", userId: claims.data.sub, sessionId: claims.data.sid };
  }

  /** Accepts a service token only from `callers`, signed by that caller's key, aimed at us. */
  async verifyService(token: string, callers: readonly ServiceName[]): Promise<ServicePrincipal> {
    let issuer: unknown;
    try {
      issuer = decodeJwt(token).iss;
    } catch {
      throw new DomainError("common.unauthenticated");
    }
    if (!isServiceName(issuer)) throw new DomainError("common.unauthenticated");
    if (!callers.includes(issuer)) throw new DomainError("common.forbidden");
    const key = await this.serviceKey(issuer);
    try {
      await jwtVerify(token, key, {
        issuer,
        audience: this.options.serviceName,
        algorithms: ALGORITHMS,
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
        maxTokenAge: "5m",
      });
    } catch {
      throw new DomainError("common.unauthenticated");
    }
    return { kind: "service", name: issuer };
  }

  private async verifyUser(token: string, audience: string) {
    try {
      const { payload } = await jwtVerify(token, this.userKeys, {
        issuer: IDENTITY_ISSUER,
        audience,
        algorithms: ALGORITHMS,
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
      });
      return payload;
    } catch {
      throw new DomainError("common.unauthenticated");
    }
  }

  private serviceKey(issuer: ServiceName) {
    let key = this.serviceKeys.get(issuer);
    if (!key) {
      const jwk = this.options.trustedServiceKeys[issuer];
      if (!jwk) throw new DomainError("common.unauthenticated");
      key = importJWK(jwk, "EdDSA");
      this.serviceKeys.set(issuer, key);
    }
    return key;
  }
}
