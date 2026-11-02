import { createHmac } from "node:crypto";

import { Module } from "@nestjs/common";

import { SERVICE_CONFIG, UNIT_OF_WORK } from "@lavieco/service-kit";
import type { UnitOfWork } from "@lavieco/service-kit/ports";

import type { ProgramEnv } from "../../config/env";
import { AUDIT_TRAIL, ProgramAuditModule, type AuditTrail } from "../audit";
import { VouchersAdminController } from "./api/vouchers-admin.controller";
import {
  RATE_LIMITER,
  VOUCHER_REDEMPTION_REPOSITORY,
  VOUCHER_REPOSITORY,
  type RateLimiter,
  type VoucherRedemptionRepository,
  type VoucherRepository,
} from "./application/ports/voucher-repository.port";
import { VoucherAdminService } from "./application/voucher-admin-service";
import { VoucherLedger } from "./application/voucher-ledger";
import { voucherPersistence } from "./infrastructure/voucher.models";
import {
  MongoRateLimiter,
  MongoVoucherRedemptionRepository,
  MongoVoucherRepository,
} from "./infrastructure/voucher.repository";
import { VOUCHER_ADMIN_SERVICE, VOUCHER_LEDGER } from "./vouchers.tokens";

@Module({
  imports: [voucherPersistence, ProgramAuditModule],
  controllers: [VouchersAdminController],
  providers: [
    { provide: VOUCHER_REPOSITORY, useClass: MongoVoucherRepository },
    { provide: VOUCHER_REDEMPTION_REPOSITORY, useClass: MongoVoucherRedemptionRepository },
    { provide: RATE_LIMITER, useClass: MongoRateLimiter },
    {
      provide: VOUCHER_ADMIN_SERVICE,
      useFactory: (vouchers: VoucherRepository, audit: AuditTrail, unitOfWork: UnitOfWork) =>
        new VoucherAdminService(vouchers, audit, unitOfWork),
      inject: [VOUCHER_REPOSITORY, AUDIT_TRAIL, UNIT_OF_WORK],
    },
    {
      provide: VOUCHER_LEDGER,
      useFactory: (
        vouchers: VoucherRepository,
        redemptions: VoucherRedemptionRepository,
        limiter: RateLimiter,
        env: ProgramEnv,
      ) =>
        new VoucherLedger(vouchers, redemptions, limiter, (value) =>
          // Buckets keep an HMAC, never a raw IP or email (no new secret needed for it).
          createHmac("sha256", Buffer.from(env.TICKET_LINK_SECRET, "base64"))
            .update(`rate-limit:${value}`)
            .digest("base64url"),
        ),
      inject: [VOUCHER_REPOSITORY, VOUCHER_REDEMPTION_REPOSITORY, RATE_LIMITER, SERVICE_CONFIG],
    },
  ],
  exports: [VOUCHER_LEDGER],
})
export class VouchersModule {}
