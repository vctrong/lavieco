import type { EventRecord } from "../../modules/events";
import type { OrderRecord } from "../../modules/orders/domain/order";
import type { TicketRecord } from "../../modules/orders/domain/ticket";
import type { TicketEmailInput } from "../../modules/orders/infrastructure/ticket-email.template";

/**
 * Made-up orders for the ticket email tests and `npm run mail:preview`. No real data:
 * names and addresses are invented, emails use the reserved `.test` domain.
 */
const NOW = new Date("2026-10-18T03:00:00.000Z");
const WEB = "http://localhost:3000";
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function fakeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "64b7f0c2a1b2c3d4e5f60720",
    kind: "standard",
    slug: "workshop-chau-cay-vo-so",
    status: "published",
    title: "Workshop làm chậu cây từ bột vỏ sò",
    typeId: "64b7f0c2a1b2c3d4e5f60718",
    format: "offline",
    startAt: new Date("2026-11-08T07:00:00.000Z"),
    endAt: new Date("2026-11-08T10:00:00.000Z"),
    venue: { name: "Xưởng thử nghiệm", address: "Ninh Kiều, Cần Thơ", mapUrl: null },
    onlineUrl: null,
    summary: "",
    description: "",
    safetyNotes: "",
    cancellationPolicy: "",
    forChildren: false,
    speakers: [],
    agenda: [],
    faq: [],
    cover: null,
    gallery: [],
    form: { questions: [] },
    pricing: { isFree: false, priceFrom: 150_000 },
    publishedAt: NOW,
    firstPublishedAt: NOW,
    revision: 3,
    createdBy: { userId: "64b7f0c2a1b2c3d4e5f60721" },
    updatedBy: { userId: "64b7f0c2a1b2c3d4e5f60721" },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function fakeOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "64b7f0c2a1b2c3d4e5f60730",
    orderCode: 2611428,
    eventId: "64b7f0c2a1b2c3d4e5f60720",
    userId: null,
    verificationId: "proof-1",
    buyer: {
      fullName: "Nguyễn Thị Khách",
      email: "khach.dat.ve@example.test",
      emailNormalized: "khach.dat.ve@example.test",
      phone: "0901 234 567",
      phoneNormalized: "+84901234567",
      isGuardian: false,
    },
    items: [{ ticketTypeId: "t1", name: "Vé tiêu chuẩn", unitPrice: 150_000, quantity: 1 }],
    amount: 150_000,
    status: "paid",
    seatState: "sold",
    expiresAt: NOW,
    paidAt: NOW,
    cancelledAt: null,
    expiredAt: null,
    refundedAt: null,
    refundNote: "",
    note: "",
    consent: { version: "2026-01", at: NOW },
    safetyAcknowledgedAt: null,
    flags: { refundRequired: false, amountMismatch: false, latePayment: false },
    payment: null,
    lastReconciledAt: null,
    revision: 2,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/** Deterministic, well-formed ticket codes (`LVC-` + 6 Crockford characters). */
export function fakeTickets(names: readonly string[]): TicketRecord[] {
  return names.map((ticketTypeName, index) => {
    const code = Array.from(
      { length: 6 },
      (_, position) => CODE_ALPHABET[(index * 7 + position * 11 + 3) % CODE_ALPHABET.length],
    ).join("");
    return {
      id: `ticket-${index}`,
      code: `LVC-${code}`,
      qrToken: `fake-qr-token-${index}-${"x".repeat(28)}`,
      orderId: "64b7f0c2a1b2c3d4e5f60730",
      eventId: "64b7f0c2a1b2c3d4e5f60720",
      ticketTypeId: `t${index}`,
      ticketTypeName,
      status: "valid",
      checkedInAt: null,
      checkedInBy: null,
      createdAt: NOW,
    };
  });
}

const SAFETY =
  "Mang giày kín mũi và mặc áo có thể dính bẩn.\nKhu vực có dụng cụ sắc: trẻ em đi cùng người lớn.";

const input = (
  order: OrderRecord,
  event: EventRecord,
  tickets: TicketRecord[],
  extra: Partial<TicketEmailInput> = {},
): TicketEmailInput => ({
  order,
  event,
  tickets,
  ticketPageUrl: `${WEB}/ve/fake-signed-token`,
  webAppUrl: WEB,
  ...extra,
});

/** Every combination the brief asks for: paid/free, offline/online, 1/many, notes, member/guest, resend. */
export function ticketEmailCases(): { name: string; input: TicketEmailInput }[] {
  const many = fakeTickets(["Vé người lớn", "Vé người lớn", "Vé trẻ em"]);
  const manyItems = [
    { ticketTypeId: "t0", name: "Vé người lớn", unitPrice: 150_000, quantity: 2 },
    { ticketTypeId: "t2", name: "Vé trẻ em", unitPrice: 80_000, quantity: 1 },
  ];
  const free = {
    amount: 0,
    items: [{ ticketTypeId: "t0", name: "Vé miễn phí", unitPrice: 0, quantity: 1 }],
  };
  const online = fakeEvent({
    title: "Talkshow: nghệ thuật từ phế liệu",
    format: "online",
    venue: null,
    onlineUrl: "https://meet.example.test/lavieco-talkshow",
  });
  return [
    {
      name: "paid-offline-one-guest",
      input: input(fakeOrder(), fakeEvent(), fakeTickets(["Vé tiêu chuẩn"])),
    },
    {
      name: "paid-offline-many-safety-member",
      input: input(
        fakeOrder({ userId: "64b7f0c2a1b2c3d4e5f60799", items: manyItems, amount: 380_000 }),
        fakeEvent({ safetyNotes: SAFETY, forChildren: true }),
        many,
      ),
    },
    {
      name: "free-online-one-guest",
      input: input(fakeOrder(free), online, fakeTickets(["Vé miễn phí"])),
    },
    {
      name: "free-online-many-member",
      input: input(
        fakeOrder({
          ...free,
          userId: "64b7f0c2a1b2c3d4e5f60799",
          items: [{ ...free.items[0]!, quantity: 3 }],
        }),
        online,
        fakeTickets(["Vé miễn phí", "Vé miễn phí", "Vé miễn phí"]),
      ),
    },
    {
      name: "free-offline-safety-guest",
      input: input(
        fakeOrder(free),
        fakeEvent({ safetyNotes: SAFETY }),
        fakeTickets(["Vé miễn phí"]),
      ),
    },
    {
      name: "resend-paid-offline-many",
      input: input(fakeOrder({ items: manyItems, amount: 380_000 }), fakeEvent(), many, {
        resend: true,
      }),
    },
    {
      name: "multi-day-twenty-tickets",
      input: input(
        fakeOrder({
          items: [{ ticketTypeId: "t0", name: "Vé tiêu chuẩn", unitPrice: 150_000, quantity: 20 }],
          amount: 3_000_000,
        }),
        fakeEvent({
          endAt: new Date("2026-11-09T10:00:00.000Z"),
          safetyNotes: SAFETY,
          title: "Trại sáng tạo xanh hai ngày: tái chế vỏ sò, nhựa và vải vụn thành tác phẩm",
        }),
        fakeTickets(Array.from({ length: 20 }, () => "Vé tiêu chuẩn")),
      ),
    },
  ];
}
