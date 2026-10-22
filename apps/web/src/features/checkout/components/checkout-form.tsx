"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { FiEdit2, FiLock, FiMail, FiMinus, FiPlus } from "react-icons/fi";

import { ORDER_LIMITS, type PublicEventDetail } from "@lavieco/shared/events";
import {
  BusyLabel,
  Button,
  CheckboxField,
  FieldError,
  FormAlert,
  FormErrorNote,
  RequiredNote,
  SelectField,
  TextareaField,
  TextField,
  cn,
  useFormErrors,
} from "@lavieco/ui";

import { FailureAlert } from "@/shared/components/failure-alert";
import { HoneypotField } from "@/shared/components/honeypot-field";
import { OtpInput } from "@/shared/components/otp-input";
import { TurnstileWidget } from "@/shared/components/turnstile-widget";
import { FORM_TEXT } from "@/shared/constants/form-text";
import { callAction } from "@/shared/call-action";
import type { FormFailure } from "@/shared/form-failures";
import { useCountdown } from "@/shared/hooks/use-countdown";

import { confirmCheckout, startCheckout } from "../actions/checkout";
import { TEXT } from "../constants/text";
import { validateCheckoutDraft, type CheckoutDraft, type CheckoutDraftInput } from "../schemas";
import type { CheckoutError } from "../types";
import { formatVnd } from "../utils/format";
import { failureOf, fieldOfFailure } from "./messages";

type CheckoutFormProps = {
  event: Pick<PublicEventDetail, "slug" | "ticketTypes" | "registration">;
  member: { email: string; displayName: string } | null;
  turnstileSiteKey: string | null;
  /** Starting quantities (the choice made on the event page, see `initialQuantities`). */
  initialQuantities: Record<string, number>;
};

type Pending = { challengeId: string; resendAvailableAt: string };
type AnswerValue = string | string[];

/** DOM id of a form field, so the error summary can link and move focus to it. */
const fieldId = (key: string) => `ck-${key}`;

/**
 * Registration and ticket purchase (docs/05 §5.1–5.2): tickets → booker → questions
 * → consents → email code → seats held. Prices shown here are indicative: the service
 * recomputes them. Nothing is stored in the browser.
 */
export function CheckoutForm({
  event,
  member,
  turnstileSiteKey,
  initialQuantities,
}: CheckoutFormProps) {
  const t = TEXT.vi;
  const f = FORM_TEXT.vi;
  const router = useRouter();
  const codeHintId = useId();
  const rules = event.registration;
  const { questions, safetyAcknowledgementRequired, guardianConfirmationRequired } = rules;

  const [quantities, setQuantities] = useState<Record<string, number>>(initialQuantities);
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
  const [failure, setFailure] = useState<FormFailure | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // A Turnstile token is single use: every submit asks the widget for a new one.
  const [turnstileReset, setTurnstileReset] = useState(0);
  // The code step never renders on the server, so the clock is always known here.
  const resendIn = useCountdown(pending?.resendAvailableAt ?? null) ?? 0;
  const codeFormRef = useRef<HTMLFormElement>(null);
  const stepTopRef = useRef<HTMLDivElement>(null);
  const shownStep = useRef(step);

  // Changing step swaps a long form for a short one: bring its top into view and move
  // focus there, or the buyer is left at the bottom of an empty page.
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    stepTopRef.current?.scrollIntoView({ block: "start" });
    stepTopRef.current?.focus({ preventScroll: true });
  }, [step]);

  const lines = useMemo(
    () =>
      event.ticketTypes
        .filter((ticket) => (quantities[ticket.id] ?? 0) > 0)
        .map((ticket) => ({ ticket, quantity: quantities[ticket.id]! })),
    [event.ticketTypes, quantities],
  );
  const total = lines.reduce((sum, line) => sum + line.ticket.price * line.quantity, 0);

  const input: CheckoutDraftInput = {
    eventSlug: event.slug,
    items: lines.map((line) => ({ ticketTypeId: line.ticket.id, quantity: line.quantity })),
    buyer,
    answers: Object.fromEntries(
      Object.entries(answers).filter(([, value]) =>
        Array.isArray(value) ? value.length > 0 : value.trim() !== "",
      ),
    ),
    note: note.trim(),
    dataConsent: consents.data,
    safetyAcknowledged: consents.safety,
    isGuardian: consents.guardian,
  };
  const checked = validateCheckoutDraft(input, rules);

  // Form order: the summary lists, and focus goes to, the first field from the top.
  const fieldOrder = [
    "tickets",
    "fullName",
    "email",
    "phone",
    ...questions.map((question) => question.id),
    "dataConsent",
    "safety",
    "guardian",
  ];
  const form = useFormErrors({
    fieldOrder,
    fieldId,
    live: checked.success ? {} : checked.errors,
    paused: busy,
  });
  const { errors, invalidFields } = form;
  const touched = form.clearServerError;

  const setQuantity = (id: string, max: number, next: number) => {
    touched("tickets");
    setQuantities((current) => ({ ...current, [id]: Math.max(0, Math.min(max, next)) }));
  };

  /** Shows a failed step: under its field when it has one, and above the button. */
  const showFailure = (error: CheckoutError) => {
    const field = fieldOfFailure(error);
    const shown = failureOf(error);
    if (field) form.showServerErrors({ [field]: shown.message });
    setFailure(shown);
  };

  const send = async (next: CheckoutDraft) => {
    setBusy(true);
    setFailure(null);
    const result = await callAction(() => startCheckout(next));
    setTurnstileReset((count) => count + 1);
    if (result.status === "ok" && result.kind === "placed") {
      router.push(result.redirectTo);
      return true;
    }
    setBusy(false);
    if (result.status === "invalid") {
      form.showServerErrors(result.fieldErrors);
      return false;
    }
    if (result.status === "error") {
      showFailure(result);
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
    setFailure(null);
    // The booker's fields are read from the form itself: a browser autofill may fill
    // them without a change event, leaving React state behind what the person sees.
    const formData = new FormData(formEvent.currentTarget);
    const typed = {
      fullName: String(formData.get("fullName") ?? buyer.fullName),
      email: String(formData.get("email") ?? buyer.email),
      phone: String(formData.get("phone") ?? buyer.phone),
    };
    setBuyer(typed);
    const current = validateCheckoutDraft({ ...input, buyer: typed }, rules);
    if (!form.check(current.success ? {} : current.errors) || !current.success) return;
    const next: CheckoutDraft = {
      ...current.data,
      website: String(formData.get("website") ?? ""),
      turnstileToken: String(formData.get("turnstileToken") ?? "") || undefined,
    };
    setDraft(next);
    await send(next);
  };

  const handleCode = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (busy || !draft || !pending) return;
    if (!/^\d{6}$/.test(code)) {
      setFailure({ message: t.errors.codeFormat, reload: false });
      return;
    }
    setBusy(true);
    setFailure(null);
    const result = await callAction(() =>
      confirmCheckout({ draft, challengeId: pending.challengeId, code }),
    );
    if (result.status === "ok") {
      router.push(result.redirectTo);
      return;
    }
    setBusy(false);
    if (result.status === "invalid") {
      setStep("form");
      form.showServerErrors(result.fieldErrors);
    } else if (fieldOfFailure(result)) {
      // Sold out while the code was being typed: back to the tickets to change them.
      setStep("form");
      showFailure(result);
    } else setFailure(failureOf(result));
  };

  const handleResend = async () => {
    if (!draft || resendIn > 0 || busy) return;
    // A Turnstile token is single use: the code step has its own widget for resends.
    const token = codeFormRef.current
      ? String(new FormData(codeFormRef.current).get("turnstileToken") ?? "") || undefined
      : undefined;
    if (await send({ ...draft, turnstileToken: token })) setNotice(t.otp.resent);
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
      <div
        ref={stepTopRef}
        tabIndex={-1}
        className="grid scroll-mt-24 gap-8 outline-none lg:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <form
          ref={codeFormRef}
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
              invalid={Boolean(failure)}
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
                setFailure(null);
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
          {resendIn === 0 ? (
            <TurnstileWidget siteKey={turnstileSiteKey} resetSignal={turnstileReset} />
          ) : null}
          <FormAlert tone="success" message={notice} />
          <FailureAlert failure={failure} />
          <Button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="w-full disabled:opacity-70"
          >
            <BusyLabel busy={busy} idle={t.otp.submit} sending={t.otp.submitting} />
          </Button>
        </form>
        {summary}
      </div>
    );
  }

  const errorIdOf = (key: string) => `${fieldId(key)}-error`;

  return (
    <div
      ref={stepTopRef}
      tabIndex={-1}
      className="grid scroll-mt-24 gap-8 outline-none lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        <HoneypotField />
        <RequiredNote text={f.requiredNote} />

        <section
          aria-labelledby="chon-ve"
          className="rounded-3xl border border-hairline bg-white p-6 md:p-8"
        >
          <h2 id="chon-ve" className="font-display text-2xl text-deep-blue">
            {t.checkout.ticketsTitle}
          </h2>
          <p className="mt-1 text-[13px] text-charcoal/65">{t.checkout.ticketsHint}</p>
          <ul
            id={fieldId("tickets")}
            tabIndex={-1}
            aria-labelledby="chon-ve"
            aria-describedby={errors.tickets ? errorIdOf("tickets") : undefined}
            className={cn(
              "mt-5 divide-y divide-hairline rounded-2xl outline-none",
              errors.tickets && "ring-1 ring-error/60",
            )}
          >
            {event.ticketTypes.map((ticket) => {
              const quantity = quantities[ticket.id] ?? 0;
              const max = ticket.availability.seatsLeft
                ? Math.min(ticket.maxPerOrder, ticket.availability.seatsLeft)
                : ticket.maxPerOrder;
              const soldOut = ticket.availability.soldOut;
              return (
                <li key={ticket.id} className="flex items-center justify-between gap-4 px-1 py-4">
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
            <FieldError id={errorIdOf("tickets")} message={errors.tickets} />
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
            id={fieldId("fullName")}
            label={t.checkout.fullName}
            name="fullName"
            autoComplete="name"
            required
            placeholder={t.checkout.fullNamePlaceholder}
            value={buyer.fullName}
            onChange={(e) => {
              touched("fullName");
              setBuyer({ ...buyer, fullName: e.target.value });
            }}
            error={errors.fullName}
            disabled={busy}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              tone="light"
              id={fieldId("email")}
              label={t.checkout.email}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder={t.checkout.emailPlaceholder}
              value={buyer.email}
              onChange={(e) => {
                touched("email");
                setBuyer({ ...buyer, email: e.target.value });
              }}
              error={errors.email}
              disabled={busy}
            />
            <TextField
              tone="light"
              id={fieldId("phone")}
              label={t.checkout.phone}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder={t.checkout.phonePlaceholder}
              value={buyer.phone}
              onChange={(e) => {
                touched("phone");
                setBuyer({ ...buyer, phone: e.target.value });
              }}
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
              const error = errors[question.id];
              const set = (next: AnswerValue) => {
                touched(question.id);
                setAnswers((current) => ({ ...current, [question.id]: next }));
              };
              if (question.type === "short_text") {
                return (
                  <TextField
                    key={question.id}
                    tone="light"
                    id={fieldId(question.id)}
                    label={label}
                    required={question.required}
                    hint={question.description || undefined}
                    value={typeof value === "string" ? value : ""}
                    maxLength={ORDER_LIMITS.answerTextMax}
                    onChange={(e) => set(e.target.value)}
                    error={error}
                    disabled={busy}
                  />
                );
              }
              if (question.type === "paragraph") {
                return (
                  <TextareaField
                    key={question.id}
                    tone="light"
                    id={fieldId(question.id)}
                    rows={3}
                    label={label}
                    required={question.required}
                    hint={question.description || undefined}
                    value={typeof value === "string" ? value : ""}
                    maxLength={ORDER_LIMITS.answerTextMax}
                    onChange={(e) => set(e.target.value)}
                    error={error}
                    disabled={busy}
                  />
                );
              }
              if (question.type === "dropdown") {
                return (
                  <SelectField
                    key={question.id}
                    tone="light"
                    id={fieldId(question.id)}
                    label={label}
                    required={question.required}
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
                    error={error}
                    disabled={busy}
                  />
                );
              }
              const multiple = question.type === "multiple_choice";
              const picked = Array.isArray(value) ? value : value ? [value] : [];
              const legendId = `${fieldId(question.id)}-legend`;
              const descriptionId = `${fieldId(question.id)}-description`;
              return (
                <fieldset
                  key={question.id}
                  role={multiple ? "group" : "radiogroup"}
                  aria-labelledby={legendId}
                  aria-required={!multiple && question.required ? true : undefined}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={
                    error
                      ? errorIdOf(question.id)
                      : question.description
                        ? descriptionId
                        : undefined
                  }
                  className="space-y-2"
                >
                  <legend
                    id={legendId}
                    className="mb-2 text-[13px] font-semibold text-deep-blue/80"
                  >
                    {label}
                    {question.required ? (
                      <span aria-hidden="true" className="ml-0.5 text-error">
                        *
                      </span>
                    ) : null}
                  </legend>
                  {question.description ? (
                    <p id={descriptionId} className="text-[12px] text-charcoal/60">
                      {question.description}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {question.options.map((option, index) => {
                      const checked = picked.includes(option.id);
                      return (
                        <label
                          key={option.id}
                          className={cn(
                            "cursor-pointer rounded-full border px-4 py-2 text-[13px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-brand/40",
                            checked
                              ? "border-emerald-brand bg-mint-mist text-deep-blue"
                              : error
                                ? "border-error/60 text-charcoal/80 hover:border-emerald-brand"
                                : "border-hairline text-charcoal/80 hover:border-emerald-brand",
                          )}
                        >
                          <input
                            id={index === 0 ? fieldId(question.id) : undefined}
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
                  {error ? <FieldError id={errorIdOf(question.id)} message={error} /> : null}
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
            id={fieldId("dataConsent")}
            label={t.checkout.dataConsent}
            required
            checked={consents.data}
            onChange={(e) => {
              touched("dataConsent");
              setConsents({ ...consents, data: e.target.checked });
            }}
            error={errors.dataConsent}
          />
          {safetyAcknowledgementRequired ? (
            <CheckboxField
              tone="light"
              id={fieldId("safety")}
              label={t.checkout.safety}
              required
              checked={consents.safety}
              onChange={(e) => {
                touched("safety");
                setConsents({ ...consents, safety: e.target.checked });
              }}
              error={errors.safety}
            />
          ) : null}
          {guardianConfirmationRequired ? (
            <CheckboxField
              tone="light"
              id={fieldId("guardian")}
              label={t.checkout.guardian}
              required
              checked={consents.guardian}
              onChange={(e) => {
                touched("guardian");
                setConsents({ ...consents, guardian: e.target.checked });
              }}
              error={errors.guardian}
            />
          ) : null}
        </section>

        <TurnstileWidget siteKey={turnstileSiteKey} resetSignal={turnstileReset} />
        <FormErrorNote
          announcement={invalidFields.length > 0 ? f.announce(invalidFields.length) : null}
          message={invalidFields.length > 0 ? f.aboveSubmit(invalidFields.length) : null}
        />
        <FailureAlert failure={failure} />
        <Button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="w-full disabled:opacity-70"
        >
          <BusyLabel busy={busy} idle={t.checkout.submit} sending={t.checkout.submitting} />
        </Button>
      </form>
      {summary}
    </div>
  );
}
