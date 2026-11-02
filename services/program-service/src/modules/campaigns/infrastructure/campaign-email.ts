import { createHmac, timingSafeEqual } from "node:crypto";

import {
  emailButton,
  emailLink,
  emailParagraph,
  multiline,
  renderEmail,
} from "@lavieco/service-kit";
import type { EmailSender } from "@lavieco/service-kit/ports";
import type { CampaignRendered } from "@lavieco/shared/events";

import type { EventRepository } from "../../events";
import type { OrderLinks, OrderRepository, TicketRepository } from "../../orders";
import type { CampaignMailer, PostEventTexts } from "../application/campaign-service";
import {
  fillVariables,
  paragraphsOf,
  type CampaignRecord,
  type RecipientRecord,
  type TemplateValues,
} from "../domain/campaign";

const ID = /^[0-9a-f]{24}$/;

const DATE = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Text of "Sau sự kiện" campaigns; a draft can be edited before it is sent. */
export const POST_EVENT_TEXTS: PostEventTexts = {
  name: (title) => `Sau sự kiện: ${title}`,
  subject: "Cảm ơn bạn đã tham gia {{chuong_trinh}}",
  preheader: "Vài lời cảm ơn từ LAVIECO, và một câu hỏi ngắn.",
  body: "Xin chào {{ten}},\n\nCảm ơn bạn đã đến với {{chuong_trinh}} ngày {{ngay}}. Sự có mặt của bạn giúp LAVIECO tiếp tục biến phế liệu thành giá trị qua nghệ thuật.\n\nNếu có một phút, bạn chia sẻ cảm nhận để các buổi sau tốt hơn nhé.",
  ctaLabel: "Gửi cảm nhận",
};

/** `<recipientId>.<HMAC>`: no email in the link, and nobody can unsubscribe someone else. */
export class UnsubscribeTokens {
  constructor(private readonly secret: Buffer) {}

  sign(recipientId: string) {
    return `${recipientId}.${this.mac(recipientId)}`;
  }

  verify(token: string): string | null {
    const [id, mac, extra] = token.split(".");
    if (!id || !mac || extra !== undefined || !ID.test(id)) return null;
    const expected = Buffer.from(this.mac(id));
    const given = Buffer.from(mac);
    return given.length === expected.length && timingSafeEqual(given, expected) ? id : null;
  }

  private mac(recipientId: string) {
    return createHmac("sha256", this.secret)
      .update(`unsubscribe:${recipientId}`)
      .digest("base64url");
  }
}

type PersonalLinks = {
  ticketPage: string;
  /** One per ticket. */
  surveys: string[];
};

export type CampaignEmailInput = {
  campaign: Pick<CampaignRecord, "subject" | "preheader" | "body" | "cta" | "type">;
  name: string;
  eventTitle: string;
  eventDate: string;
  links: PersonalLinks;
  unsubscribeUrl: string;
  webAppUrl: string;
};

/**
 * One person's email, on the shared layout. The body is plain text: everything is
 * escaped, so nothing typed can become HTML. Someone with several tickets gets one
 * survey link per ticket, with a line asking to pass them on.
 */
export function campaignEmail(input: CampaignEmailInput) {
  const { campaign, name, eventTitle, eventDate, links, unsubscribeUrl, webAppUrl } = input;
  const many = links.surveys.length > 1;
  const values: TemplateValues = {
    ten: name || "bạn",
    chuong_trinh: eventTitle,
    ngay: eventDate,
    link_ve: links.ticketPage,
    link_khao_sat: links.surveys[0] ?? "",
  };
  const subject = fillVariables(campaign.subject, values);
  const paragraphs = paragraphsOf(fillVariables(campaign.body, values));
  const ctaUrl =
    campaign.cta?.link === "ticket"
      ? links.ticketPage
      : campaign.cta?.link === "survey"
        ? (links.surveys[0] ?? "")
        : (campaign.cta?.url ?? "");
  const manyLinks = many
    ? [
        emailParagraph(
          "Bạn có nhiều vé: mỗi vé có một link riêng, hãy chuyển cho người đi cùng để họ tự trả lời.",
        ),
        ...links.surveys.map((url, index) =>
          emailParagraph(emailLink(`Gửi cảm nhận cho vé ${index + 1}`, url)),
        ),
      ]
    : [];
  const showCta = Boolean(campaign.cta && ctaUrl) && !(campaign.cta?.link === "survey" && many);
  const bodyHtml = [
    ...paragraphs.map((paragraph) => emailParagraph(multiline(paragraph))),
    showCta ? emailButton(campaign.cta!.label, ctaUrl) : "",
    ...(campaign.cta?.link === "survey" ? manyLinks : []),
    emailParagraph(
      `Không muốn nhận thư như thế này nữa? ${emailLink("Huỷ nhận", unsubscribeUrl)}.`,
      { muted: true, small: true },
    ),
  ].join("\n");
  const textLines = [
    ...paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(showCta ? [`${campaign.cta!.label}: ${ctaUrl}`, ""] : []),
    ...(campaign.cta?.link === "survey" && many
      ? [
          "Mỗi vé có một link riêng, hãy chuyển cho người đi cùng:",
          ...links.surveys.map((url, index) => `Vé ${index + 1}: ${url}`),
          "",
        ]
      : []),
    `Huỷ nhận: ${unsubscribeUrl}`,
  ];
  const rendered = renderEmail({
    subject,
    preheader: fillVariables(campaign.preheader, values) || subject,
    heading: subject,
    bodyHtml,
    textLines,
    reason: escapeReason(eventTitle),
    siteUrl: webAppUrl,
  });
  return {
    ...rendered,
    // RFC 8058: mail apps offer their own one-click button, which POSTs here.
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl.replace("/huy-nhan/", "/api/huy-nhan/")}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

const escapeReason = (eventTitle: string) =>
  eventTitle
    ? `Bạn nhận email này vì đã đặt vé hoặc tham gia "${eventTitle}" của LAVIECO.`
    : "Bạn nhận email này vì đã có liên hệ với LAVIECO.";

/** Loads what a person's links need, by id, when the email is sent. */
export class SmtpCampaignMailer implements CampaignMailer {
  constructor(
    private readonly sender: EmailSender,
    private readonly events: EventRepository,
    private readonly orders: OrderRepository,
    private readonly tickets: TicketRepository,
    private readonly links: OrderLinks,
    private readonly tokens: UnsubscribeTokens,
    private readonly surveySlug: (id: string) => Promise<string | null>,
    private readonly webAppUrl: string,
  ) {}

  verifyUnsubscribe(token: string) {
    return this.tokens.verify(token);
  }

  async render(campaign: CampaignRecord, recipient: RecipientRecord | null) {
    const mail = await this.compose(campaign, recipient);
    const rendered: CampaignRendered = { subject: mail.subject, html: mail.html, text: mail.text };
    return rendered;
  }

  async send(campaign: CampaignRecord, recipient: RecipientRecord) {
    const { subject, html, text, attachments, headers } = await this.compose(campaign, recipient);
    await this.sender.send({ to: recipient.email, subject, html, text, attachments, headers });
  }

  async sendTest(campaign: CampaignRecord, email: string) {
    const { subject, html, text, attachments } = await this.compose(campaign, null);
    await this.sender.send({ to: email, subject: `[Thử] ${subject}`, html, text, attachments });
  }

  private async compose(campaign: CampaignRecord, recipient: RecipientRecord | null) {
    const [event] = campaign.eventId ? await this.events.findByIds([campaign.eventId]) : [];
    const slug = campaign.surveyId ? await this.surveySlug(campaign.surveyId) : null;
    const links = recipient
      ? await this.linksOf(recipient, slug)
      : {
          ticketPage: `${this.webAppUrl}/tra-cuu-ve`,
          surveys: slug ? [`${this.webAppUrl}/khao-sat/${slug}`] : [],
        };
    return campaignEmail({
      campaign,
      name: recipient?.name ?? "bạn",
      eventTitle: event?.title ?? "",
      eventDate: event ? DATE.format(event.startAt) : "",
      links,
      unsubscribeUrl: recipient
        ? `${this.webAppUrl}/huy-nhan/${this.tokens.sign(recipient.id)}`
        : `${this.webAppUrl}/huy-nhan/xem-truoc`,
      webAppUrl: this.webAppUrl,
    });
  }

  private async linksOf(recipient: RecipientRecord, slug: string | null): Promise<PersonalLinks> {
    const firstOrder = recipient.orderIds[0];
    const tickets = (
      await Promise.all(recipient.ticketIds.map((id) => this.tickets.findById(id)))
    ).filter((ticket) => ticket !== null && ticket.status !== "void");
    return {
      ticketPage: firstOrder
        ? `${this.webAppUrl}/ve/${this.links.sign(firstOrder)}`
        : `${this.webAppUrl}/tra-cuu-ve`,
      surveys: slug
        ? tickets.length > 0
          ? tickets.map(
              (ticket) =>
                `${this.webAppUrl}/khao-sat/${slug}?t=${encodeURIComponent(
                  this.links.signTicket(ticket!),
                )}`,
            )
          : [`${this.webAppUrl}/khao-sat/${slug}`]
        : [],
    };
  }
}
