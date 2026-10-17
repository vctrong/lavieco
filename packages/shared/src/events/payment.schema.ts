import { z } from "zod";

/**
 * payOS payment webhook as `web` forwards it (ADR-0015): the raw JSON body, untouched.
 * The signature is checked in program-service with the checksum key, through the
 * official SDK; this schema only bounds the shape before verification.
 */
export const payosWebhookBodySchema = z.object({
  code: z.string().max(10),
  desc: z.string().max(500),
  success: z.boolean(),
  signature: z.string().min(1).max(256),
  data: z
    .object({
      orderCode: z.number().int(),
      amount: z.number().int(),
      description: z.string(),
      accountNumber: z.string(),
      reference: z.string(),
      transactionDateTime: z.string(),
      currency: z.string(),
      paymentLinkId: z.string(),
      code: z.string(),
      desc: z.string(),
    })
    // The signature covers every field payOS sent, including the payer's details.
    .loose(),
});
export type PayosWebhookBody = z.infer<typeof payosWebhookBodySchema>;

export const payosWebhookResponseSchema = z.object({ received: z.literal(true) });
export type PayosWebhookResponse = z.infer<typeof payosWebhookResponseSchema>;
