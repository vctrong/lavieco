/**
 * Every business error code and the HTTP status it maps to (S6, docs/04 §6.3).
 * Codes are `<domain>.<snake_case>`; the `title` is technical English for logs and
 * Problem Details. Wording shown to people is chosen by the frontend from the code.
 */
export const ERROR_CATALOG = {
  "common.validation_failed": { status: 400, title: "Request validation failed" },
  "common.unauthenticated": { status: 401, title: "Authentication required" },
  "common.forbidden": { status: 403, title: "Permission denied" },
  "common.not_found": { status: 404, title: "Resource not found" },
  "common.conflict": { status: 409, title: "Resource was modified concurrently" },
  "common.rate_limited": { status: 429, title: "Too many requests" },
  "common.internal": { status: 500, title: "Internal error" },
  "common.unavailable": { status: 503, title: "Dependency unavailable" },

  "auth.invalid_credentials": { status: 401, title: "Invalid email or password" },
  "auth.account_locked": { status: 423, title: "Account temporarily locked" },
  "auth.mfa_token_invalid": { status: 401, title: "Second-factor step expired or invalid" },
  "auth.mfa_code_invalid": { status: 401, title: "Invalid second-factor code" },
  "auth.session_invalid": { status: 401, title: "Session is invalid or was revoked" },
  "auth.step_up_required": {
    status: 403,
    title: "Re-enter an authenticator code to confirm this action",
  },

  "password.too_weak": { status: 400, title: "Password does not meet the policy" },

  "invitation.invalid": { status: 400, title: "Invitation is invalid, used or expired" },
  "invitation.totp_invalid": { status: 400, title: "Authenticator code does not match" },

  "otp.code_invalid": { status: 400, title: "Verification code is incorrect" },
  "otp.expired": { status: 410, title: "Verification code expired" },
  "otp.attempts_exceeded": { status: 429, title: "Too many incorrect codes" },
  "otp.send_limited": { status: 429, title: "Too many codes requested" },
  "otp.verification_invalid": { status: 400, title: "Email verification is invalid or used" },

  "push.unavailable": { status: 503, title: "Web Push is not configured on this server" },

  "member.email_taken": { status: 409, title: "An account already exists for this email" },
  "member.consent_required": { status: 422, title: "Data-processing consent is required" },
  "member.google_failed": { status: 400, title: "Google sign-in could not be completed" },
  "member.google_not_allowed": { status: 403, title: "Google sign-in is not available here" },
  "event.invalid_transition": {
    status: 409,
    title: "Status change not allowed from the current status",
  },
  "event.has_registrations": { status: 409, title: "Event already has registrations" },
  "event.not_publishable": { status: 422, title: "Event does not meet the publishing conditions" },
  "event.form_locked": { status: 409, title: "Form change not allowed once people registered" },
  "event.slug_taken": { status: 409, title: "Another event already uses this slug" },
  "event.slug_locked": { status: 409, title: "Slug cannot change after the event was published" },
  "event.type_unavailable": { status: 422, title: "Event type does not exist or is archived" },
  "event.past_event_restricted": { status: 409, title: "Past events have no tickets or form" },
  "event.online_url_locked": {
    status: 409,
    title: "The online link of an event with sold tickets can be changed, not removed",
  },
  "event.discard_not_allowed": {
    status: 409,
    title: "Only never-published drafts can be discarded",
  },

  "event.capacity_below_taken": {
    status: 409,
    title: "Capacity cannot be lower than the seats already taken",
  },
  "ticket_type.locked": {
    status: 409,
    title: "Ticket type change not allowed once seats are taken",
  },
  "ticket_type.limit_reached": { status: 422, title: "Too many ticket types for this event" },

  // One answer for an unknown, expired, used-up or not-for-you code (no code probing).
  "voucher.invalid": { status: 422, title: "This code cannot be used for this order" },
  "voucher.amount_too_low": {
    status: 422,
    title: "The amount left after this code is below what the payment provider accepts",
  },
  "voucher.code_taken": { status: 409, title: "Another voucher already uses this code" },
  "voucher.locked": { status: 409, title: "Voucher change not allowed once it has been used" },

  "survey.answers_invalid": { status: 422, title: "These answers do not fit the survey" },
  "survey.consent_required": { status: 422, title: "Consent is required for this survey" },
  "survey.link_invalid": { status: 422, title: "This survey link is not valid" },
  "survey.closed": { status: 409, title: "This survey no longer takes answers" },
  "survey.already_answered": { status: 409, title: "This survey was already answered" },
  "survey.slug_taken": { status: 409, title: "Another survey already uses this address" },
  "survey.locked": { status: 409, title: "Survey change not allowed once people answered" },
  "survey.no_questions": { status: 422, title: "A survey needs at least one question" },

  "campaign.invalid_state": { status: 409, title: "Not possible in this campaign's state" },
  "campaign.empty": { status: 422, title: "This audience has nobody to send to" },
  "campaign.count_mismatch": {
    status: 409,
    title: "The typed number of recipients does not match the list",
  },

  "order.registration_closed": { status: 409, title: "Event does not take registrations now" },
  "order.sold_out": { status: 409, title: "Not enough seats left for this order" },
  "order.items_invalid": { status: 422, title: "Ticket selection is not allowed" },
  "order.answers_invalid": { status: 422, title: "Registration answers are incomplete or invalid" },
  "order.consent_required": {
    status: 422,
    title: "Data consent (and safety notes, when present) must be accepted",
  },
  "order.email_mismatch": {
    status: 400,
    title: "The verified email differs from the booker's email",
  },
  "order.invalid_state": { status: 409, title: "Order status does not allow this action" },

  "payment.signature_invalid": { status: 400, title: "Payment webhook signature is invalid" },
  "payment.unavailable": { status: 503, title: "Payment provider is unavailable" },

  "media.type_unsupported": { status: 415, title: "Only JPEG, PNG and WebP images are accepted" },
  "media.format_refused": {
    status: 415,
    title: "HEIC, HEIF and AVIF images are not supported yet",
  },
  "media.too_large": { status: 413, title: "Image is larger than allowed for this use" },
  "media.image_invalid": { status: 422, title: "Image could not be decoded" },
  "media.too_many_pixels": { status: 422, title: "Image has too many pixels" },
  "media.unavailable": {
    status: 409,
    title: "Image does not exist, was deleted or belongs elsewhere",
  },

  "handbook.no_draft": { status: 409, title: "There is no draft of the handbook to edit" },
  "handbook.draft_exists": {
    status: 409,
    title: "A draft is in progress; publish or discard it first",
  },
  "handbook.publish_blocked": {
    status: 422,
    title: "The draft cannot be published (no page, or a chapter without pages)",
  },
  "handbook.structure_invalid": {
    status: 422,
    title: "Chapters or pages are unknown, repeated or out of bounds",
  },
  "handbook.page_unknown": { status: 404, title: "This page is not in the draft" },
  "handbook.version_unknown": { status: 404, title: "No such handbook version" },
  "handbook.version_not_restorable": {
    status: 409,
    title: "The images of this version were cleaned up; it cannot be restored",
  },
  "handbook.upload_invalid": {
    status: 422,
    title: "Upload is unknown, incomplete, of the wrong kind or out of order",
  },
  "handbook.file_type_invalid": {
    status: 415,
    title: "Only PDF files, or JPEG, PNG and WebP images, are accepted",
  },
  "handbook.not_published": { status: 404, title: "The handbook is not published yet" },
  "handbook.preview_invalid": { status: 404, title: "Preview link is invalid or expired" },

  "event_type.name_taken": { status: 409, title: "An event type with this name already exists" },

  "product.slug_taken": { status: 409, title: "Another product already uses this address" },
  "product.sku_taken": { status: 409, title: "Another variant already uses this SKU" },
  "product.publish_blocked": {
    status: 422,
    title: "Story card, handbook link, described images and a variant on sale are required",
  },
  "product.variants_invalid": {
    status: 422,
    title: "Variants do not match the product options (missing, unknown or repeated values)",
  },
  "product.images_invalid": { status: 422, title: "Images are repeated or too many" },
  "product.price_invalid": {
    status: 422,
    title: "The struck-through price must be above the selling price",
  },
  "product.category_unknown": { status: 422, title: "Category or partner brand does not exist" },
  "product.stock_below_held": {
    status: 409,
    title: "Stock cannot go below the units held by pending orders",
  },
  "product.variant_locked": {
    status: 409,
    title: "A variant that was ordered cannot be removed; archive it instead",
  },
  "category.name_taken": { status: 409, title: "A category with this name already exists" },
  "brand.slug_taken": { status: 409, title: "Another partner brand already uses this address" },
  "import.file_invalid": {
    status: 422,
    title: "Not a readable .xlsx/.csv with the template headers, or too large / too many rows",
  },
  "import.has_errors": { status: 422, title: "Some rows still have errors: fix or skip them" },
  "import.locked": { status: 409, title: "This import is being saved or is closed" },
  "cart.unavailable": { status: 409, title: "This product is not on sale any more" },
  "review.not_allowed": { status: 409, title: "Only lines of a delivered order can be reviewed" },
  "review.already_reviewed": { status: 409, title: "This order line already has a review" },
  "cart.full": { status: 422, title: "The cart already holds the maximum number of lines" },
  "shop_order.cart_empty": { status: 422, title: "Nothing to order: the cart is empty" },
  "shop_order.cart_changed": {
    status: 409,
    title: "Prices or stock changed since the cart was shown: check it again",
  },
  "shop_order.out_of_stock": { status: 409, title: "Not enough stock left for this order" },
  "shop_order.cod_not_allowed": {
    status: 422,
    title: "Cash on delivery is not offered for this amount",
  },
  "shop_order.too_many_pending": {
    status: 429,
    title: "This email already has orders waiting for payment",
  },
  "shop_order.invalid_action": {
    status: 409,
    title: "This action is not possible in the order's status",
  },
} as const satisfies Record<string, { status: number; title: string }>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export const PROBLEM_TYPE_BASE = "https://lavieco.io.vn/problems/";

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && Object.hasOwn(ERROR_CATALOG, value);
}
