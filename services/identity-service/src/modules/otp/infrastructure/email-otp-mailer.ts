import type { EmailSender } from "@lavieco/service-kit/ports";
import { OTP_RULES, type OtpPurpose } from "@lavieco/shared/identity";

import type { OtpMailer } from "../application/ports/otp.ports";
import { accountExistsEmail, otpCodeEmail } from "./otp-mail.templates";

/**
 * OTP emails go out directly (not through the outbox): the person is waiting for the
 * code right now, and a failure must be reported so they can retry (like invitations,
 * docs/03 §4.3).
 */
export class EmailOtpMailer implements OtpMailer {
  constructor(
    private readonly sender: EmailSender,
    private readonly webUrl: string,
  ) {}

  sendCode(to: string, code: string, purpose: OtpPurpose) {
    return this.sender.send({
      to,
      ...otpCodeEmail(code, purpose, OTP_RULES.ttlSeconds / 60, this.webUrl),
    });
  }

  sendAccountExists(to: string) {
    return this.sender.send({ to, ...accountExistsEmail(this.webUrl) });
  }
}
