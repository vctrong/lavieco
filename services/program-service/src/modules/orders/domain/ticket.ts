import type { TicketStatus } from "@lavieco/shared/events";

/** `tickets` (docs/03 §9.2): one per seat, no personal data on it (BR-13, BR-16). */
export type TicketRecord = {
  id: string;
  code: string;
  /** Encoded in the QR; the image is rendered on demand, never stored. */
  qrToken: string;
  orderId: string;
  eventId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  /** People per unit of the line; with the indexes (from 1): "suất 1 · vé 2/2". */
  seatsPerUnit: number;
  unitIndex: number;
  seatIndex: number;
  status: TicketStatus;
  checkedInAt: Date | null;
  checkedInBy: string | null;
  createdAt: Date;
};

export type NewTicket = Pick<
  TicketRecord,
  | "code"
  | "qrToken"
  | "orderId"
  | "eventId"
  | "ticketTypeId"
  | "ticketTypeName"
  | "seatsPerUnit"
  | "unitIndex"
  | "seatIndex"
>;
