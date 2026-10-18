import { PayOS } from "@payos/node";
import { describe, expect, it } from "vitest";

import { PayosGateway } from "./payos-gateway";

const credentials = { clientId: "client", apiKey: "api", checksumKey: "checksum-key-for-tests" };

/** A webhook body as payOS sends it, signed with the SDK's own crypto. */
async function signedWebhook(checksumKey: string, overrides: Record<string, unknown> = {}) {
  const data = {
    orderCode: 1234567890,
    amount: 150000,
    description: "LAVIECO",
    accountNumber: "0123456789",
    reference: "FT26291000001",
    transactionDateTime: "2026-10-20 10:00:00",
    currency: "VND",
    paymentLinkId: "link-1",
    code: "00",
    desc: "Thành công",
    counterAccountBankId: "",
    counterAccountBankName: "",
    counterAccountName: "NGUOI CHUYEN",
    counterAccountNumber: "999",
    virtualAccountName: "",
    virtualAccountNumber: "",
    ...overrides,
  };
  const client = new PayOS({ ...credentials, checksumKey, logLevel: "off" });
  const signature = await client.crypto.createSignatureFromObj(data, checksumKey);
  return { code: "00", desc: "success", success: true, data, signature };
}

describe("PayosGateway.verifyWebhook (official SDK)", () => {
  const gateway = new PayosGateway(credentials);

  it("accepts a body signed with our checksum key and keeps reconciliation fields only", async () => {
    const verified = await gateway.verifyWebhook(await signedWebhook(credentials.checksumKey));
    expect(verified).toEqual({
      orderCode: 1234567890,
      amount: 150000,
      reference: "FT26291000001",
      paymentLinkId: "link-1",
      transactionDateTime: "2026-10-20 10:00:00",
      code: "00",
    });
    expect(JSON.stringify(verified)).not.toContain("NGUOI CHUYEN");
  });

  it("refuses another key, a tampered amount and a missing signature", async () => {
    const forged = await signedWebhook("someone-else");
    await expect(gateway.verifyWebhook(forged)).rejects.toMatchObject({
      code: "payment.signature_invalid",
    });
    const tampered = await signedWebhook(credentials.checksumKey);
    tampered.data.amount = 1000;
    await expect(gateway.verifyWebhook(tampered)).rejects.toMatchObject({
      code: "payment.signature_invalid",
    });
    await expect(
      gateway.verifyWebhook({ ...tampered, signature: undefined }),
    ).rejects.toMatchObject({ code: "payment.signature_invalid" });
  });
});
