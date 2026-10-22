// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicEventDetail } from "@lavieco/shared/events";

import { autofill, mimicBrowserFormData } from "@/shared/testing/dom";

const startCheckout = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  unstable_isUnrecognizedActionError: () => false,
}));
vi.mock("../actions/checkout", () => ({
  startCheckout: (input: unknown) => startCheckout(input),
  confirmCheckout: vi.fn(),
}));

const { CheckoutForm } = await import("./checkout-form");

mimicBrowserFormData();

const TICKET_ID = "6650a1b2c3d4e5f6a7b8c9d0";
const EVENT: Pick<PublicEventDetail, "slug" | "ticketTypes" | "registration"> = {
  slug: "workshop-gia-dinh-chuong-gio-vo-oc",
  ticketTypes: [
    {
      id: TICKET_ID,
      name: "Vé gia đình",
      description: "",
      price: 350_000,
      saleStartAt: null,
      saleEndAt: null,
      maxPerOrder: 2,
      availability: { soldOut: false, seatsLeft: null },
    },
  ],
  registration: {
    open: true,
    blocker: null,
    questions: [],
    safetyAcknowledgementRequired: false,
    guardianConfirmationRequired: false,
  },
};

let root: Root;
let container: HTMLDivElement;

beforeEach(async () => {
  startCheckout.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <CheckoutForm
        event={EVENT}
        member={null}
        turnstileSiteKey={null}
        initialQuantities={{ [TICKET_ID]: 1 }}
      />,
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const field = (name: string) => container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;

describe("CheckoutForm with browser autofill", () => {
  it("books with the autofilled booker read from the form, not stale React state", async () => {
    startCheckout.mockResolvedValue({
      status: "ok",
      kind: "code",
      challengeId: "challenge-123456",
      resendAvailableAt: "2026-10-22T10:00:45.000Z",
    });
    await act(async () => {
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    });
    // Filled right before the click on the button, with no event: React state is empty.
    autofill(field("fullName"), "Nguyễn Văn A");
    autofill(field("email"), "khach@example.test");
    autofill(field("phone"), "0901 234 567");
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    });
    expect(startCheckout).toHaveBeenCalledTimes(1);
    expect(startCheckout.mock.calls[0]?.[0]).toMatchObject({
      buyer: { fullName: "Nguyễn Văn A", email: "khach@example.test", phone: "0901 234 567" },
      items: [{ ticketTypeId: TICKET_ID, quantity: 1 }],
    });
    expect(container.textContent).not.toMatch(/Invalid input|expected|received/);
  });

  it("does not call the action while a field is missing", async () => {
    autofill(field("email"), "khach@example.test");
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    });
    expect(startCheckout).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Vui lòng nhập họ tên.");
    expect(container.textContent).toContain("Còn 3 mục cần điền hoặc sửa");
  });
});
