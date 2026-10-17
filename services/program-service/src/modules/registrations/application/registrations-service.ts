import type { UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import type {
  OrderStatus,
  RegistrationExportQuery,
  RegistrationListQuery,
  TicketStatus,
} from "@lavieco/shared/events";
import type { Role } from "@lavieco/shared/permissions";

import type { AuditTrail } from "../../audit";
import type { EventRecord, EventRepository } from "../../events";
import {
  answerText,
  type OrderAnswerRepository,
  type OrderRecord,
  type OrderRepository,
  type TicketRecord,
  type TicketRepository,
} from "../../orders";
import { exportFileName, safeCell } from "../domain/spreadsheet";

export type RegistrationColumn = { questionId: string; label: string; hidden: boolean };

/** One ticket of a paid (or refunded) order, with the booker and the order's answers. */
export type RegistrationRow = {
  order: OrderRecord;
  ticket: TicketRecord;
  /** `questionId` → answer text. */
  answers: Record<string, string>;
};

export type Sheet = { fileName: string; header: string[]; rows: string[][] };

/** Writes the sheet as `.xlsx` (exceljs streaming writer, ADR-0017). */
export interface WorkbookWriter {
  write(sheet: Sheet): Promise<Buffer>;
}

const ORDER_STATUS_TEXT: Record<OrderStatus, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  expired: "Hết hạn",
  cancelled: "Đã huỷ",
  refunded: "Đã hoàn tiền",
};
const TICKET_STATUS_TEXT: Record<TicketStatus, string> = {
  valid: "Chưa check-in",
  used: "Đã check-in",
  void: "Đã huỷ",
};

const DATE_TIME = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const EXPORT_PAGE = 100;

/**
 * Registrations of one event (docs/05 §5.8): one row per ticket, a column per custom
 * question, hidden questions included (BR-17: their answers still export). The export
 * holds personal data: step-up is checked by the controller, and the export is audited.
 */
export class RegistrationsService {
  constructor(
    private readonly events: EventRepository,
    private readonly orders: OrderRepository,
    private readonly tickets: TicketRepository,
    private readonly answers: OrderAnswerRepository,
    private readonly workbook: WorkbookWriter,
    private readonly audit: AuditTrail,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async list(eventId: string, query: RegistrationListQuery) {
    const event = await this.event(eventId);
    const page = await this.orders.listForRegistrations(eventId, query);
    return {
      columns: columnsOf(event),
      items: await this.rows(event, page.items),
      nextCursor: page.nextCursor,
    };
  }

  async export(
    eventId: string,
    query: RegistrationExportQuery,
    actor: { userId: string; roles: readonly Role[]; requestId: string | null },
    now = new Date(),
  ): Promise<{ fileName: string; content: Buffer }> {
    const event = await this.event(eventId);
    const columns = columnsOf(event);
    const rows: RegistrationRow[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.orders.listForRegistrations(eventId, {
        includeRefunded: query.includeRefunded,
        cursor,
        limit: EXPORT_PAGE,
      });
      rows.push(...(await this.rows(event, page.items)));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    const sheet: Sheet = {
      fileName: exportFileName(event.slug, now),
      header: [
        "STT",
        "Họ tên",
        "Email",
        "Số điện thoại",
        "Loại vé",
        "Mã vé",
        "Mã đơn",
        "Trạng thái thanh toán",
        "Check-in",
        "Thời gian đăng ký",
        ...columns.map((column) => (column.hidden ? `${column.label} (đã ẩn)` : column.label)),
      ],
      rows: rows.map((row, index) =>
        [
          String(index + 1),
          row.order.buyer.fullName,
          row.order.buyer.email,
          row.order.buyer.phone,
          row.ticket.ticketTypeName,
          row.ticket.code,
          String(row.order.orderCode),
          ORDER_STATUS_TEXT[row.order.status],
          row.ticket.checkedInAt
            ? `${TICKET_STATUS_TEXT.used} ${DATE_TIME.format(row.ticket.checkedInAt)}`
            : TICKET_STATUS_TEXT[row.ticket.status],
          DATE_TIME.format(row.order.createdAt),
          ...columns.map((column) => row.answers[column.questionId] ?? ""),
        ].map(safeCell),
      ),
    };
    const content = await this.workbook.write(sheet);
    await this.unitOfWork.run((tx) =>
      this.audit.record(
        tx,
        {
          action: "registration.export",
          actor: { userId: actor.userId, roles: actor.roles },
          target: { type: "event", id: event.id },
          requestId: actor.requestId,
          meta: { rows: rows.length, includeRefunded: query.includeRefunded },
        },
        now,
      ),
    );
    return { fileName: sheet.fileName, content };
  }

  private async event(eventId: string): Promise<EventRecord> {
    const event = await this.events.findById(eventId);
    if (!event) throw new DomainError("common.not_found");
    return event;
  }

  private async rows(event: EventRecord, orders: OrderRecord[]): Promise<RegistrationRow[]> {
    const ids = orders.map((order) => order.id);
    const [tickets, answers] = await Promise.all([
      this.tickets.listByOrders(ids),
      this.answers.findByOrders(ids),
    ]);
    const questions = new Map(event.form.questions.map((question) => [question.id, question]));
    return orders.flatMap((order) => {
      const text: Record<string, string> = {};
      for (const answer of answers.get(order.id) ?? []) {
        text[answer.questionId] = answerText(questions.get(answer.questionId), answer.value);
      }
      return (tickets.get(order.id) ?? []).map((ticket) => ({ order, ticket, answers: text }));
    });
  }
}

/** Every question ever on the form, in form order, hidden ones included (BR-17). */
function columnsOf(event: EventRecord): RegistrationColumn[] {
  return event.form.questions.map((question) => ({
    questionId: question.id,
    label: question.label,
    hidden: question.hidden,
  }));
}
