import type { UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import type {
  VoucherCreateRequest,
  VoucherListQuery,
  VoucherStatusRequest,
  VoucherUpdateRequest,
} from "@lavieco/shared/events";
import type { Role } from "@lavieco/shared/permissions";

import type { AuditTrail } from "../../audit";
import {
  assertVoucherChangeAllowed,
  toVoucherChanges,
  type VoucherChanges,
  type VoucherRecord,
} from "../domain/voucher";
import { VoucherCodeTakenError, type VoucherRepository } from "./ports/voucher-repository.port";

export type VoucherActor = { userId: string; roles: readonly Role[]; requestId: string | null };

const COPY_SUFFIX = "-COPY";

/** "Ưu đãi" in the back office (`voucher:write`, checked by the controller). Audited. */
export class VoucherAdminService {
  constructor(
    private readonly vouchers: VoucherRepository,
    private readonly audit: AuditTrail,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  list(query: VoucherListQuery) {
    return this.vouchers.list(query);
  }

  async get(id: string): Promise<VoucherRecord> {
    const voucher = await this.vouchers.findById(id);
    if (!voucher) throw new DomainError("common.not_found");
    return voucher;
  }

  create(input: VoucherCreateRequest, actor: VoucherActor, now = new Date()) {
    return this.insert(toVoucherChanges(input), "voucher.create", actor, now);
  }

  async update(id: string, input: VoucherUpdateRequest, actor: VoucherActor, now = new Date()) {
    const current = await this.get(id);
    const changes = toVoucherChanges(input);
    assertVoucherChangeAllowed(current, changes);
    return this.codeGuard(() =>
      this.unitOfWork.run(async (tx) => {
        const saved = await this.vouchers.update(id, input.revision, changes, tx);
        if (!saved) throw new DomainError("common.conflict");
        await this.record("voucher.update", saved, actor, now, tx);
        return saved;
      }),
    );
  }

  async setStatus(id: string, input: VoucherStatusRequest, actor: VoucherActor, now = new Date()) {
    await this.get(id);
    return this.unitOfWork.run(async (tx) => {
      const saved = await this.vouchers.setStatus(id, input.revision, input.status, tx);
      if (!saved) throw new DomainError("common.conflict");
      await this.record("voucher.status", saved, actor, now, tx);
      return saved;
    });
  }

  /** "Nhân bản": a paused copy with fresh counters, so it cannot be used by accident. */
  async duplicate(id: string, actor: VoucherActor, now = new Date()) {
    const source = await this.get(id);
    let code = `${source.code}${COPY_SUFFIX}`;
    for (let n = 2; await this.vouchers.findByCode(code); n += 1) {
      code = `${source.code}${COPY_SUFFIX}${n}`;
    }
    const changes: VoucherChanges = {
      code,
      name: source.name,
      description: source.description,
      scope: source.scope,
      eventId: source.eventId,
      ticketTypeIds: source.ticketTypeIds,
      excludedEventIds: source.excludedEventIds,
      eventTypeIds: source.eventTypeIds,
      discountType: source.discountType,
      value: source.value,
      maxDiscount: source.maxDiscount,
      minSeats: source.minSeats,
      minSubtotal: source.minSubtotal,
      eligibility: source.eligibility,
      minPaidOrders: source.minPaidOrders,
      allowlist: source.allowlist,
      totalUses: source.totalUses,
      perCustomer: source.perCustomer,
      startAt: source.startAt,
      endAt: source.endAt,
      visibility: source.visibility,
    };
    const copy = await this.insert(changes, "voucher.create", actor, now);
    return this.vouchers.setStatus(copy.id, copy.revision, "paused").then((saved) => saved ?? copy);
  }

  private insert(
    changes: VoucherChanges,
    action: "voucher.create",
    actor: VoucherActor,
    now: Date,
  ) {
    return this.codeGuard(() =>
      this.unitOfWork.run(async (tx) => {
        const saved = await this.vouchers.insert(this.vouchers.newId(), changes, tx);
        await this.record(action, saved, actor, now, tx);
        return saved;
      }),
    );
  }

  private async codeGuard<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof VoucherCodeTakenError) throw new DomainError("voucher.code_taken");
      throw error;
    }
  }

  /** Ids and the code only: the allowlist is personal data and stays out of the audit. */
  private record(
    action: "voucher.create" | "voucher.update" | "voucher.status",
    voucher: VoucherRecord,
    actor: VoucherActor,
    now: Date,
    tx: Parameters<AuditTrail["record"]>[0],
  ) {
    return this.audit.record(
      tx,
      {
        action,
        actor: { userId: actor.userId, roles: actor.roles },
        target: { type: "voucher", id: voucher.id },
        requestId: actor.requestId,
        meta: { code: voucher.code, status: voucher.status },
      },
      now,
    );
  }
}
