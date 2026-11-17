import type { UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import {
  orderDisplayStatus,
  type OrderDisplayStatus,
  type RegistrationExportQuery,
  type RegistrationListQuery,
  type TicketStatus,
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
import { exportFileName } from "../domain/spreadsheet";
import type { SheetCell, SheetColumn, SheetTone, Workbook, WorkbookWriter } from "./workbook";

export type RegistrationColumn = { questionId: string; label: string; hidden: boolean };

/** One ticket of a paid (or refunded) order, with the booker and the order's answers. */
export type RegistrationRow = {
  order: OrderRecord;
  ticket: TicketRecord;
  /** `questionId` → answer text. */
  answers: Record<string, string>;
};

const ORDER_STATUS_TEXT: Record<OrderDisplayStatus, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  confirmed: "Đã xác nhận",
  expired: "Hết hạn",
  cancelled: "Đã huỷ",
  refunded: "Đã hoàn tiền",
};
const TICKET_STATUS_TEXT: Record<TicketStatus, string> = {
  valid: "Chưa check-in",
  used: "Đã check-in",
  void: "Đã huỷ",
};

/** Colour of each status in the sheet: what is done is green, what needs a look stands out. */
const STATUS_TONES: Readonly<Record<string, SheetTone>> = {
  [ORDER_STATUS_TEXT.paid]: "ok",
  [ORDER_STATUS_TEXT.confirmed]: "ok",
  [ORDER_STATUS_TEXT.pending]: "warn",
  [ORDER_STATUS_TEXT.expired]: "muted",
  [ORDER_STATUS_TEXT.cancelled]: "muted",
  [ORDER_STATUS_TEXT.refunded]: "bad",
  [TICKET_STATUS_TEXT.used]: "ok",
  [TICKET_STATUS_TEXT.void]: "muted",
};

/**
 * Columns of the registrations sheet, grouped as the team reads it on the day: who,
 * which ticket and whether they came, then payment, then the form's own questions.
 */
const REGISTRATION_COLUMNS: SheetColumn[] = [
  { header: "STT", kind: "index" },
  { header: "Họ tên", kind: "text" },
  { header: "Số điện thoại", kind: "code" },
  { header: "Email", kind: "text" },
  { header: "Loại vé", kind: "text" },
  { header: "Mã vé", kind: "code" },
  { header: "Check-in", kind: "status", tones: STATUS_TONES },
  { header: "Giờ check-in", kind: "dateTime" },
  { header: "Suất", kind: "number" },
  { header: "Vé trong suất", kind: "code" },
  { header: "Thanh toán", kind: "status", tones: STATUS_TONES },
  { header: "Mã đơn", kind: "code" },
  { header: "Thời gian đăng ký", kind: "dateTime" },
  { header: "Mã ưu đãi", kind: "code" },
  { header: "Giảm giá", kind: "money" },
];

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

    const book: Workbook = {
      fileName: exportFileName(event.slug, now),
      table: {
        name: "Người đăng ký",
        columns: [
          ...REGISTRATION_COLUMNS,
          ...columns.map((column): SheetColumn => ({
            header: column.hidden ? `${column.label} (đã ẩn)` : column.label,
            kind: "longText",
          })),
        ],
        rows: rows.map((row, index): SheetCell[] => [
          index + 1,
          row.order.buyer.fullName,
          row.order.buyer.phone,
          row.order.buyer.email,
          row.ticket.ticketTypeName,
          row.ticket.code,
          row.ticket.checkedInAt ? TICKET_STATUS_TEXT.used : TICKET_STATUS_TEXT[row.ticket.status],
          row.ticket.checkedInAt,
          row.ticket.unitIndex,
          `${row.ticket.seatIndex}/${row.ticket.seatsPerUnit}`,
          ORDER_STATUS_TEXT[orderDisplayStatus(row.order)],
          String(row.order.orderCode),
          row.order.createdAt,
          row.order.discount?.code ?? null,
          row.order.discount?.amount ?? null,
          ...columns.map((column) => row.answers[column.questionId] ?? null),
        ]),
      },
      summary: summaryOf(event, rows, query.includeRefunded, now),
    };
    const content = await this.workbook.write(book);
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
    return { fileName: book.fileName, content };
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

/** The "Tổng quan" sheet: the event, when the file was made, and the counts. */
function summaryOf(
  event: EventRecord,
  rows: readonly RegistrationRow[],
  includeRefunded: boolean,
  now: Date,
): NonNullable<Workbook["summary"]> {
  const count = (keep: (row: RegistrationRow) => boolean) => rows.filter(keep).length;
  const byType = new Map<string, number>();
  for (const row of rows) {
    byType.set(row.ticket.ticketTypeName, (byType.get(row.ticket.ticketTypeName) ?? 0) + 1);
  }
  return {
    name: "Tổng quan",
    title: event.title,
    lines: [
      ["Bắt đầu", event.startAt],
      ["Kết thúc", event.endAt],
      ["Xuất lúc", now],
      ["Tổng số vé", rows.length],
      ["Đã check-in", count((row) => row.ticket.checkedInAt !== null)],
      [
        "Chưa check-in",
        count((row) => row.ticket.checkedInAt === null && row.ticket.status === "valid"),
      ],
      ["Vé đã huỷ", count((row) => row.ticket.status === "void")],
      ["Gồm đơn đã hoàn tiền", includeRefunded ? "Có" : "Không"],
      ...[...byType].map(([name, total]): [string, SheetCell] => [`Loại vé: ${name}`, total]),
    ],
  };
}

/** Every question ever on the form, in form order, hidden ones included (BR-17). */
function columnsOf(event: EventRecord): RegistrationColumn[] {
  return event.form.questions.map((question) => ({
    questionId: question.id,
    label: question.label,
    hidden: question.hidden,
  }));
}
