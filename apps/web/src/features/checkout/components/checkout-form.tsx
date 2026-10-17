"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent } from "react";
import { FiEdit2, FiLock, FiMail, FiMinus, FiPlus } from "react-icons/fi";

import { ORDER_LIMITS, type PublicEventDetail } from "@lavieco/shared/events";
import { Button, CheckboxField, SelectField, TextareaField, TextField, cn } from "@lavieco/ui";

import { FormAlert } from "@/shared/components/form-alert";
import { HoneypotField } from "@/shared/components/honeypot-field";
import { OtpInput } from "@/shared/components/otp-input";
import { TurnstileWidget } from "@/shared/components/turnstile-widget";
import { useCountdown } from "@/shared/hooks/use-countdown";

import { confirmCheckout, startCheckout } from "../actions/checkout";
import { TEXT } from "../constants/text";
import { buyerSchema, type CheckoutDraft } from "../schemas";
import { formatVnd } from "../utils/format";
import { messageFor } from "./messages";

type CheckoutFormProps = {
  event: Pick<PublicEventDetail, "slug" | "ticketTypes" | "registration">;
  member: { email: string; displayName: string } | null;
  turnstileSiteKey: string | null;
};

type Pending = { challengeId: string; resendAvailableAt: string };
type AnswerValue = string | string[];

/**
 * Registration and ticket purchase (docs/05 §5.1–5.2): tickets → booker → questions
 * → consents → email code → seats held. Prices shown here are indicative: the service
 * recomputes them. Nothing is stored in the browser.
 */
export function CheckoutForm({ event, member, turnstileSiteKey }: CheckoutFormProps) {
  const t = TEXT.vi;
  const router = useRouter();
  const codeHintId = useId();
  const { questions, safetyAcknowledgementRequired, guardianConfirmationRequired } =
    event.registration;

  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const first = event.ticketTypes.find((ticket) => !ticket.availability.soldOut);
    return first && event.ticketTypes.length === 1 ? { [first.id]: 1 } : {};
  });
  const [buyer, setBuyer] = useState({
    fullName: member?.displayName ?? "",
    email: member?.email ?? "",
    phone: "",
  });
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [note, setNote] = useState("");
  const [consents, setConsents] = useState({ data: false, safety: false, guardian: false });
  const [step, setStep] = useState<"form" | "code">("form");
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resendIn = useCountdown(pending?.resendAvailableAt ?? null);

  const lines = useMemo(
    () =>
      event.ticketTypes
        .filter((ticket) => (quantities[ticket.id] ?? 0) > 0)
        .map((ticket) => ({ ticket, quantity: quantities[ticket.id]! })),
    [event.ticketTypes, quantities],
  );
  const total = lines.reduce((sum, line) => sum + line.ticket.price * line.quantity, 0);
  const ticketCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  const setQuantity = (id: string, max: number, next: number) =>
    setQuantities((current) => ({ ...current, [id]: Math.max(0, Math.min(max, next)) }));

  /** Client-side checks mirror the service's, for quick feedback only. */
  const buildDraft = (form: HTMLFormElement): CheckoutDraft | null => {
    const nextErrors: Record<string, string> = {};
    const parsedBuyer = buyerSchema.safeParse(buyer);
    if (!parsedBuyer.success) {
      for (const issue of parsedBuyer.error.issues) {
        const field = String(issue.path[0]);
        nextErrors[field] ??= issue.message;
      }
    }
    if (ticketCount === 0) nextErrors.tickets = t.errors.noTickets;
    if (ticketCount > ORDER_LIMITS.ticketsPerOrderMax) nextErrors.tickets = t.errors.tooManyTickets;
    for (const question of questions) {
      const value = answers[question.id];
      const empty =
        value === undefined || (Array.isArray(value) ? value.length === 0 : !value.trim());
      if (question.required && empty) nextErrors[question.id] = t.validation.required;
    }
    if (!consents.data) nextErrors.dataConsent = t.validation.consent;
    if (safetyAcknowledgementRequired && !consents.safety) nextErrors.safety = t.validation.consent;
    if (guardianConfirmationRequired && !consents.guardian) {
      nextErrors.guardian = t.validation.consent;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !parsedBuyer.success) return null;
    const formData = new FormData(form);
    return {
      eventSlug: event.slug,
      items: lines.map((line) => ({ ticketTypeId: line.ticket.id, quantity: line.quantity })),
      buyer: parsedBuyer.data,
      answers: Object.fromEntries(
        Object.entries(answers).filter(([, value]) =>
          Array.isArray(value) ? value.length > 0 : value.trim() !== "",
        ),
      ),
      note: note.trim(),
      dataConsent: true,
      safetyAcknowledged: consents.safety,
      isGuardian: consents.guardian,
      website: String(formData.get("website") ?? ""),
      turnstileToken: String(formData.get("cf-turnstile-response") ?? "") || undefined,
    };
  };

  const send = async (next: CheckoutDraft) => {
    setBusy(true);
    setAlert(null);
    const result = await startCheckout(next).catch(() => null);
    if (result?.status === "ok" && result.kind === "placed") {
      router.push(result.redirectTo);
      return true;
    }
    setBusy(false);
    if (!result) {
      setAlert(t.errors.unavailable);
      return false;
    }
    if (result.status === "invalid") {
      setErrors(result.fieldErrors);
      return false;
    }
    if (result.status === "error") {
      setAlert(messageFor(result));
      return false;
    }
    setPending({ challengeId: result.challengeId, resendAvailableAt: result.resendAvailableAt });
    setCode("");
    setStep("code");
    return true;
  };

  const handleSubmit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (busy) return;
    const next = buildDraft(formEvent.currentTarget);
    if (!next) return;
    setDraft(next);
    await send(next);
  };

  const handleCode = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (busy || !draft || !pending) return;
    if (!/^\d{6}$/.test(code)) {
      setAlert(t.errors.codeFormat);
      return;
    }
    setBusy(true);
    setAlert(null);
    const result = await confirmCheckout({
      draft,
      challengeId: pending.challengeId,
      code,
    }).catch(() => null);
    if (result?.status === "ok") {
      router.push(result.redirectTo);
      return;
    }
    setBusy(false);
    if (!result) setAlert(t.errors.unavailable);
    else if (result.status === "invalid") {
      setStep("form");
      setErrors(result.fieldErrors);
    } else setAlert(messageFor(result));
  };

  const handleResend = async () => {
    if (!draft || resendIn > 0 || busy) return;
    if (await send(draft)) setNotice(t.otp.resent);
  };

  const summary = (
    <aside className="space-y-5 rounded-3xl border border-hairline bg-white p-6 lg:sticky lg:top-28 lg:self-start">
      <h2 className="font-display text-xl text-deep-blue">{t.checkout.summaryTitle}</h2>
      {lines.length > 0 ? (
        <ul className="space-y-2 text-[14px] text-charcoal/80">
          {lines.map((line) => (
            <li key={line.ticket.id} className="flex justify-between gap-3">
              <span>{t.checkout.line(line.quantity, line.ticket.name)}</span>
              <span className="shrink-0">
                {line.ticket.price === 0
                  ? t.checkout.free
                  : formatVnd(line.ticket.price * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-charcoal/60">{t.errors.noTickets}</p>
      )}
      <div className="flex items-end justify-between gap-3 rounded-2xl bg-mint-mist px-4 py-3">
        <span className="text-[12px] font-semibold uppercase tracking-museum text-deep-blue/70">
          {t.checkout.total}
        </span>
        <span className="font-display text-2xl text-deep-blue">
          {total === 0 ? t.checkout.totalFree : formatVnd(total)}
        </span>
      </div>
      <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-charcoal/65">
        <FiLock aria-hidden="true" size={14} className="mt-0.5 shrink-0 text-emerald-brand" />
        {t.checkout.holdNote}
      </p>
    </aside>
  );

  if (step === "code" && draft && pending) {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form
          onSubmit={handleCode}
          noValidate
          className="space-y-6 rounded-3xl border border-hairline bg-white p-6 md:p-8"
        >
          <h2 className="font-display text-2xl text-deep-blue">{t.otp.title}</h2>
          <div className="flex items-start gap-3 rounded-2xl bg-mint-mist px-4 py-3">
            <FiMail aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-emerald-brand" />
            <p className="text-[13px] leading-relaxed text-deep-blue">
              {t.otp.sentTo} <strong className="break-all">{draft.buyer.email}</strong>
            </p>
          </div>
          <div>
            <OtpInput
              value={code}
              onChange={setCode}
              disabled={busy}
              invalid={Boolean(alert)}
              describedBy={codeHintId}
            />
            <p id={codeHintId} className="mt-3 text-xs leading-relaxed text-charcoal/65">
              {t.otp.validity}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setPending(null);
                setAlert(null);
                setNotice(null);
              }}
              className="inline-flex items-center gap-1.5 font-medium text-deep-blue hover:text-emerald-brand"
            >
              <FiEdit2 aria-hidden="true" size={14} />
              {t.otp.changeEmail}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendIn > 0 || busy}
              className="font-medium text-deep-blue hover:text-emerald-brand disabled:cursor-default disabled:text-charcoal/50"
            >
              {resendIn > 0 ? t.otp.resendIn(resendIn) : t.otp.resend}
            </button>
          </div>
          <FormAlert tone="success" message={notice} />
          <FormAlert tone="error" message={alert} />
          <Button type="submit" disabled={busy} className="w-full disabled:opacity-70">
            {busy ? t.otp.submitting : t.otp.submit}
          </Button>
        </form>
        {summary}
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        <HoneypotField />
        <section
          aria-labelledby="chon-ve"
          className="rounded-3xl border border-hairline bg-white p-6 md:p-8"
        >
          <h2 id="chon-ve" className="font-display text-2xl text-deep-blue">
            {t.checkout.ticketsTitle}
          </h2>
          <p className="mt-1 text-[13px] text-charcoal/65">{t.checkout.ticketsHint}</p>
          <ul className="mt-5 divide-y divide-hairline">
            {event.ticketTypes.map((ticket) => {
              const quantity = quantities[ticket.id] ?? 0;
              const max = ticket.availability.seatsLeft
                ? Math.min(ticket.maxPerOrder, ticket.availability.seatsLeft)
                : ticket.maxPerOrder;
              const soldOut = ticket.availability.soldOut;
              return (
                <li key={ticket.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-deep-blue">{ticket.name}</p>
                    <p className="text-[13px] text-charcoal/65">
                      {ticket.price === 0 ? t.checkout.free : formatVnd(ticket.price)} ·{" "}
                      {soldOut
                        ? t.checkout.soldOut
                        : ticket.availability.seatsLeft
                          ? t.checkout.seatsLeft(ticket.availability.seatsLeft)
                          : t.checkout.maxPerOrder(ticket.maxPerOrder)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      aria-label={t.checkout.decrease(ticket.name)}
                      disabled={soldOut || quantity === 0 || busy}
                      onClick={() => setQuantity(ticket.id, max, quantity - 1)}
                      className="flex size-9 items-center justify-center rounded-full border border-hairline text-deep-blue hover:border-emerald-brand disabled:opacity-40"
                    >
                      <FiMinus aria-hidden="true" size={14} />
                    </button>
                    <output
                      aria-label={t.checkout.quantity(ticket.name)}
                      className="w-8 text-center font-display text-lg text-deep-blue"
                    >
                      {quantity}
                    </output>
                    <button
                      type="button"
                      aria-label={t.checkout.increase(ticket.name)}
                      disabled={soldOut || quantity >= max || busy}
                      onClick={() => setQuantity(ticket.id, max, quantity + 1)}
                      className="flex size-9 items-center justify-center rounded-full border border-hairline text-deep-blue hover:border-emerald-brand disabled:opacity-40"
                    >
                      <FiPlus aria-hidden="true" size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {errors.tickets ? (
            <p role="alert" className="mt-2 text-xs text-deep-blue">
              {errors.tickets}
            </p>
          ) : null}
        </section>

        <section
          aria-labelledby="nguoi-dat"
          className="space-y-5 rounded-3xl border border-hairline bg-white p-6 md:p-8"
        >
          <div>
            <h2 id="nguoi-dat" className="font-display text-2xl text-deep-blue">
              {t.checkout.buyerTitle}
            </h2>
            <p className="mt-1 text-[13px] text-charcoal/65">{t.checkout.buyerHint}</p>
          </div>
          {member ? (
            <p className="rounded-2xl bg-mint-mist px-4 py-3 text-[13px] text-deep-blue">
              {t.checkout.memberNote(member.email)}
            </p>
          ) : null}
          <TextField
            tone="light"
            label={t.checkout.fullName}
            name="fullName"
            autoComplete="name"
            placeholder={t.checkout.fullNamePlaceholder}
            value={buyer.fullName}
            onChange={(e) => setBuyer({ ...buyer, fullName: e.target.value })}
            error={errors.fullName}
            disabled={busy}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              tone="light"
              label={t.checkout.email}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t.checkout.emailPlaceholder}
              value={buyer.email}
              onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
              error={errors.email}
              disabled={busy}
            />
            <TextField
              tone="light"
              label={t.checkout.phone}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t.checkout.phonePlaceholder}
              value={buyer.phone}
              onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
              error={errors.phone}
              disabled={busy}
            />
          </div>
        </section>

        {questions.length > 0 ? (
          <section
            aria-labelledby="cau-hoi"
            className="space-y-5 rounded-3xl border border-hairline bg-white p-6 md:p-8"
          >
            <h2 id="cau-hoi" className="font-display text-2xl text-deep-blue">
              {t.checkout.questionsTitle}
            </h2>
            {questions.map((question) => {
              const label = question.required
                ? question.label
                : `${question.label} ${t.checkout.optional}`;
              const value = answers[question.id];
              const set = (next: AnswerValue) =>
                setAnswers((current) => ({ ...current, [question.id]: next }));
              if (question.type === "short_text") {
                return (
                  <TextField
                    key={question.id}
                    tone="light"
                    label={label}
                    hint={question.description || undefined}
                    value={typeof value === "string" ? value : ""}
                    maxLength={ORDER_LIMITS.answerTextMax}
                    onChange={(e) => set(e.target.value)}
                    error={errors[question.id]}
                    disabled={busy}
                  />
                );
              }
              if (question.type === "paragraph") {
                return (
                  <TextareaField
                    key={question.id}
                    tone="light"
                    rows={3}
                    label={label}
                    hint={question.description || undefined}
                    value={typeof value === "string" ? value : ""}
                    maxLength={ORDER_LIMITS.answerTextMax}
                    onChange={(e) => set(e.target.value)}
                    error={errors[question.id]}
                    disabled={busy}
                  />
                );
              }
              if (question.type === "dropdown") {
                return (
                  <SelectField
                    key={question.id}
                    tone="light"
                    label={label}
                    hint={question.description || undefined}
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) => set(e.target.value)}
                    options={[
                      { value: "", label: t.checkout.choose },
                      ...question.options.map((option) => ({
                        value: option.id,
                        label: option.label,
                      })),
                    ]}
                    error={errors[question.id]}
                    disabled={busy}
                  />
                );
              }
              const multiple = question.type === "multiple_choice";
              const picked = Array.isArray(value) ? value : value ? [value] : [];
              return (
                <fieldset key={question.id} className="space-y-2">
                  <legend className="mb-2 text-[13px] font-semibold text-deep-blue/80">
                    {label}
                  </legend>
                  {question.description ? (
                    <p className="text-[12px] text-charcoal/60">{question.description}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {question.options.map((option) => {
                      const checked = picked.includes(option.id);
                      return (
                        <label
                          key={option.id}
                          className={cn(
                            "cursor-pointer rounded-full border px-4 py-2 text-[13px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-brand/40",
                            checked
                              ? "border-emerald-brand bg-mint-mist text-deep-blue"
                              : "border-hairline text-charcoal/80 hover:border-emerald-brand",
                          )}
                        >
                          <input
                            type={multiple ? "checkbox" : "radio"}
                            name={`q-${question.id}`}
                            className="sr-only"
                            checked={checked}
                            disabled={busy}
                            onChange={() =>
                              set(
                                multiple
                                  ? checked
                                    ? picked.filter((id) => id !== option.id)
                                    : [...picked, option.id]
                                  : option.id,
                              )
                            }
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                  {errors[question.id] ? (
                    <p role="alert" className="text-xs text-deep-blue">
                      {errors[question.id]}
                    </p>
                  ) : null}
                </fieldset>
              );
            })}
          </section>
        ) : null}

        <section
          aria-labelledby="xac-nhan"
          className="space-y-4 rounded-3xl border border-hairline bg-white p-6 md:p-8"
        >
          <h2 id="xac-nhan" className="font-display text-2xl text-deep-blue">
            {t.checkout.consentTitle}
          </h2>
          <TextareaField
            tone="light"
            rows={2}
            label={t.checkout.note}
            placeholder={t.checkout.notePlaceholder}
            value={note}
            maxLength={ORDER_LIMITS.noteMax}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
          />
          <CheckboxField
            tone="light"
            label={t.checkout.dataConsent}
            checked={consents.data}
            onChange={(e) => setConsents({ ...consents, data: e.target.checked })}
            error={errors.dataConsent}
          />
          {safetyAcknowledgementRequired ? (
            <CheckboxField
              tone="light"
              label={t.checkout.safety}
              checked={consents.safety}
              onChange={(e) => setConsents({ ...consents, safety: e.target.checked })}
              error={errors.safety}
            />
          ) : null}
          {guardianConfirmationRequired ? (
            <CheckboxField
              tone="light"
              label={t.checkout.guardian}
              checked={consents.guardian}
              onChange={(e) => setConsents({ ...consents, guardian: e.target.checked })}
              error={errors.guardian}
            />
          ) : null}
        </section>

        <TurnstileWidget siteKey={turnstileSiteKey} />
        <FormAlert tone="error" message={alert} />
        <Button type="submit" disabled={busy} className="w-full disabled:opacity-70">
          {busy ? t.checkout.submitting : t.checkout.submit}
        </Button>
      </form>
      {summary}
    </div>
  );
}
