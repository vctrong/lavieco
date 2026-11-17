"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FiLock, FiTag } from "react-icons/fi";

import type { PublicShopSettings, ShopQuote } from "@lavieco/shared/shop";
import {
  Button,
  CheckboxField,
  Container,
  FormAlert,
  ProductFrame,
  Skeleton,
  TextField,
  TextareaField,
  choiceControlClass,
  cn,
  focusField,
} from "@lavieco/ui";

import { callAction } from "@/shared/call-action";
import { HoneypotField } from "@/shared/components/honeypot-field";
import { MEDIA_DELIVERY_READY, MediaImage } from "@/shared/components/media-image";
import { OtpInput } from "@/shared/components/otp-input";
import { TURNSTILE_FIELD, TurnstileWidget } from "@/shared/components/turnstile-widget";

import {
  confirmShopCheckout,
  quoteCheckout,
  startShopCheckout,
  type CheckoutFailure,
} from "../actions/checkout";
import { TEXT } from "../constants/text";
import { shopCheckoutFormSchema, type ShopCheckoutForm } from "../schemas";
import { formatMoney } from "../utils/format";

const t = TEXT.vi.checkout;
const FIELD_ORDER = [
  "fullName",
  "email",
  "phone",
  "recipientName",
  "recipientPhone",
  "line",
  "ward",
  "province",
  "consent",
];
const id = (name: string) => `checkout-${name}`;

type Values = Omit<ShopCheckoutForm, "consent" | "website" | "turnstileToken"> & {
  consent: boolean;
};

const failureText = (reason: CheckoutFailure | "stale_version" | "offline", ref?: string) =>
  ref ? `${t.failures[reason]} ${t.failures.reference(ref)}` : t.failures[reason];

/**
 * `/dat-hang` (UC-37): one page, the fewest steps. Prices come from the server on every
 * change (BR-21); the code is typed on the same page; stock is held only after it.
 */
export function CheckoutPage({
  settings,
  turnstileSiteKey,
  prefill,
}: {
  settings: PublicShopSettings | null;
  turnstileSiteKey: string | null;
  prefill: { fullName: string; email: string; phone: string } | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>({
    fullName: prefill?.fullName ?? "",
    email: prefill?.email ?? "",
    phone: prefill?.phone ?? "",
    method: "delivery",
    sameRecipient: true,
    recipientName: "",
    recipientPhone: "",
    line: "",
    ward: "",
    province: "",
    note: "",
    paymentMethod: "payos",
    voucherCode: "",
    consent: false,
  });
  const [applied, setApplied] = useState("");
  const [quote, setQuote] = useState<ShopQuote | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState<{ id: string; form: unknown } | null>(null);
  const [code, setCode] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const alertRef = useRef<HTMLDivElement>(null);

  // A server failure is shown above the form, out of sight of the order button: bring it
  // into view below the floating navbar (scroll-mt) and move focus there.
  useEffect(() => {
    const node = alertRef.current;
    if (!alert || !node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    node.focus({ preventScroll: true });
  }, [alert]);

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  // The email only matters for member-only codes; it is read when the quote runs.
  const emailRef = useRef(values.email);
  useEffect(() => {
    emailRef.current = values.email;
  }, [values.email]);

  useEffect(() => {
    let active = true;
    void callAction(() =>
      quoteCheckout({ method: values.method, voucherCode: applied, email: emailRef.current }),
    ).then((result) => {
      if (!active) return;
      if (result.status === "ok") {
        setQuote(result.data);
        setQuoteFailed(false);
      } else setQuoteFailed(true);
    });
    return () => {
      active = false;
    };
  }, [values.method, applied]);

  // COD only when the server says the amount allows it (Q-S4).
  const paymentMethod = quote && !quote.codAvailable ? "payos" : values.paymentMethod;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAlert(null);
    const data = new FormData(event.currentTarget);
    const form = {
      ...values,
      paymentMethod,
      voucherCode: applied,
      consent: data.get("consent") === "on",
      website: String(data.get("website") ?? ""),
      turnstileToken: String(data.get(TURNSTILE_FIELD) ?? ""),
    };
    const parsed = shopCheckoutFormSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= t.failures.invalid;
      setErrors(next);
      const first = FIELD_ORDER.find((name) => next[name]);
      if (first) focusField(id(first));
      return;
    }
    setErrors({});
    setBusy(true);
    const result = await callAction(() => startShopCheckout(form));
    setBusy(false);
    setResetSignal((n) => n + 1);
    if (result.status === "ok") {
      if (result.data.kind === "placed") router.push(result.data.redirectTo);
      else setChallenge({ id: result.data.challengeId, form });
      return;
    }
    setAlert(failureText(result.reason, "ref" in result ? result.ref : undefined));
  };

  const confirm = async () => {
    if (!challenge || code.length !== 6) return;
    setBusy(true);
    const result = await callAction(() =>
      confirmShopCheckout({ form: challenge.form, challengeId: challenge.id, code }),
    );
    setBusy(false);
    if (result.status === "ok") {
      router.push(result.data.redirectTo);
      return;
    }
    setAlert(failureText(result.reason, "ref" in result ? result.ref : undefined));
  };

  if (quote && quote.lines.length === 0) {
    return (
      <Container className="mt-dock-clearance py-14 text-center">
        <p className="text-charcoal/80">{t.empty}</p>
        <Button as={Link} href="/bo-suu-tap" className="mt-5">
          {TEXT.vi.cart.emptyCta}
        </Button>
      </Container>
    );
  }

  const field = (
    name: keyof Values & string,
    label: string,
    extra: Partial<Parameters<typeof TextField>[0]> = {},
  ) => (
    <TextField
      tone="light"
      id={id(name)}
      name={name}
      label={label}
      value={String(values[name])}
      error={errors[name]}
      disabled={busy || challenge !== null}
      onChange={(event) => set(name, event.target.value as never)}
      {...extra}
    />
  );
  const radio = "flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border p-4";

  return (
    <Container className="mt-dock-clearance py-10 md:py-14">
      <h1 className="mb-8 font-display text-4xl text-deep-blue">{t.title}</h1>
      <form
        onSubmit={submit}
        noValidate
        className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]"
      >
        <div className="space-y-6">
          <div ref={alertRef} tabIndex={-1} className="scroll-mt-32 outline-none">
            <FormAlert tone="error" message={alert} />
          </div>
          <fieldset className="space-y-4 rounded-pedestal border border-hairline bg-white p-5 md:p-6">
            <legend className="font-display text-xl text-deep-blue">{t.buyer}</legend>
            {field("fullName", t.fullName, { required: true, autoComplete: "name" })}
            <div className="grid gap-4 md:grid-cols-2">
              {field("email", t.email, {
                required: true,
                type: "email",
                autoComplete: "email",
                hint: t.emailHint,
              })}
              {field("phone", t.phone, {
                required: true,
                type: "tel",
                autoComplete: "tel",
                inputMode: "tel",
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-pedestal border border-hairline bg-white p-5 md:p-6">
            <legend className="font-display text-xl text-deep-blue">{t.delivery}</legend>
            <div className="grid gap-3 md:grid-cols-2">
              {(["delivery", "pickup"] as const)
                .filter((method) => method === "delivery" || settings?.pickup.enabled)
                .map((method) => (
                  <label
                    key={method}
                    className={cn(
                      radio,
                      values.method === method
                        ? "border-emerald-brand bg-mint-mist"
                        : "border-hairline",
                    )}
                  >
                    <input
                      type="radio"
                      name="method"
                      className={choiceControlClass("light", "mt-1")}
                      checked={values.method === method}
                      disabled={busy || challenge !== null}
                      onChange={() => set("method", method)}
                    />
                    <span>
                      <span className="block font-semibold text-deep-blue">
                        {t.methods[method]}
                      </span>
                      <span className="text-[13px] text-charcoal/70">
                        {method === "pickup" && settings
                          ? t.pickupAt(settings.pickup.address)
                          : settings
                            ? formatMoney(settings.shippingFee)
                            : ""}
                      </span>
                    </span>
                  </label>
                ))}
            </div>
            {values.method === "delivery" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  {field("line", t.line, { required: true, autoComplete: "street-address" })}
                </div>
                {field("ward", t.ward, { required: true })}
                {field("province", t.province, { required: true, autoComplete: "address-level1" })}
              </div>
            ) : null}
            <CheckboxField
              tone="light"
              label={t.sameRecipient}
              checked={values.sameRecipient}
              disabled={busy || challenge !== null}
              onChange={(event) => set("sameRecipient", event.target.checked)}
            />
            {!values.sameRecipient ? (
              <div className="grid gap-4 md:grid-cols-2">
                {field("recipientName", t.recipientName, { required: true })}
                {field("recipientPhone", t.recipientPhone, { required: true, type: "tel" })}
              </div>
            ) : null}
            <TextareaField
              tone="light"
              label={t.note}
              rows={2}
              value={values.note}
              disabled={busy || challenge !== null}
              onChange={(event) => set("note", event.target.value)}
            />
          </fieldset>

          <fieldset className="space-y-3 rounded-pedestal border border-hairline bg-white p-5 md:p-6">
            <legend className="font-display text-xl text-deep-blue">{t.payment}</legend>
            <label
              className={cn(
                radio,
                paymentMethod === "payos" ? "border-emerald-brand bg-mint-mist" : "border-hairline",
              )}
            >
              <input
                type="radio"
                name="paymentMethod"
                className={choiceControlClass("light", "mt-1")}
                checked={paymentMethod === "payos"}
                disabled={busy || challenge !== null}
                onChange={() => set("paymentMethod", "payos")}
              />
              <span>
                <span className="block font-semibold text-deep-blue">{t.payos}</span>
                <span className="text-[13px] text-charcoal/70">{t.payosHint}</span>
              </span>
            </label>
            {settings?.cod.enabled ? (
              <label
                className={cn(
                  radio,
                  paymentMethod === "cod" ? "border-emerald-brand bg-mint-mist" : "border-hairline",
                  quote && !quote.codAvailable && "cursor-not-allowed opacity-60",
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  className={choiceControlClass("light", "mt-1")}
                  checked={paymentMethod === "cod"}
                  disabled={busy || challenge !== null || (quote !== null && !quote.codAvailable)}
                  onChange={() => set("paymentMethod", "cod")}
                />
                <span>
                  <span className="block font-semibold text-deep-blue">{t.cod}</span>
                  <span className="text-[13px] text-charcoal/70">
                    {quote && !quote.codAvailable
                      ? t.codUnavailable(formatMoney(settings.cod.maxAmount))
                      : t.codHint(formatMoney(settings.cod.maxAmount))}
                  </span>
                </span>
              </label>
            ) : null}
          </fieldset>

          <div className="space-y-3">
            <CheckboxField
              tone="light"
              id={id("consent")}
              name="consent"
              required
              label={t.consent}
              error={errors.consent}
              checked={values.consent}
              disabled={busy || challenge !== null}
              onChange={(event) => set("consent", event.target.checked)}
            />
            <HoneypotField />
            {turnstileSiteKey ? (
              <TurnstileWidget siteKey={turnstileSiteKey} resetSignal={resetSignal} />
            ) : null}
          </div>

          {challenge ? (
            <section
              aria-labelledby="otp"
              className="space-y-4 rounded-pedestal border-2 border-emerald-brand bg-white p-5 md:p-6"
            >
              <h2 id="otp" className="font-display text-xl text-deep-blue">
                {t.codeTitle}
              </h2>
              <p className="text-[14.5px] text-charcoal/80">{t.codeSent(values.email)}</p>
              <OtpInput value={code} onChange={setCode} disabled={busy} invalid={false} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={confirm} disabled={busy || code.length !== 6}>
                  <FiLock aria-hidden="true" size={15} />
                  {busy ? t.sending : t.confirm}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setChallenge(null);
                    setCode("");
                  }}
                >
                  {t.back}
                </Button>
              </div>
            </section>
          ) : null}
        </div>

        <aside
          className="space-y-4 rounded-pedestal border border-hairline bg-white p-5 lg:sticky lg:top-28"
          aria-busy={!quote}
        >
          <h2 className="font-display text-xl text-deep-blue">{t.summary}</h2>
          {!quote ? (
            quoteFailed ? (
              <p className="text-[14px] text-error">{t.failures.unavailable}</p>
            ) : (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            )
          ) : (
            <>
              <ul className="space-y-3">
                {quote.lines.map((line) => (
                  <li key={line.variantId} className="flex gap-3">
                    <ProductFrame className="w-14 shrink-0">
                      {line.image && MEDIA_DELIVERY_READY ? (
                        <MediaImage
                          publicId={line.image.publicId}
                          alt={line.image.alt}
                          fill
                          sizes="56px"
                        />
                      ) : null}
                    </ProductFrame>
                    <div className="min-w-0 flex-1 text-[14px]">
                      <p className="font-semibold text-deep-blue">{line.title}</p>
                      <p className="text-charcoal/65">
                        {[line.optionLabel, `× ${line.quantity}`].filter(Boolean).join(" · ")}
                      </p>
                      {line.issue ? (
                        <p className="text-[12.5px] font-semibold text-error">{t.changed}</p>
                      ) : null}
                    </div>
                    <p className="text-[14px] font-semibold">{formatMoney(line.lineTotal)}</p>
                  </li>
                ))}
              </ul>
              <div className="flex items-end gap-2">
                <TextField
                  tone="light"
                  label={t.voucher}
                  value={values.voucherCode}
                  disabled={busy || challenge !== null}
                  onChange={(event) => set("voucherCode", event.target.value.toUpperCase())}
                  wrapperClassName="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mb-0.5 h-11"
                  disabled={busy || challenge !== null}
                  onClick={() => setApplied(values.voucherCode.trim())}
                >
                  {t.apply}
                </Button>
              </div>
              {quote.voucher ? (
                <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-ink">
                  <FiTag aria-hidden="true" /> {t.voucherApplied(quote.voucher.code)}
                </p>
              ) : quote.voucherRefused ? (
                <p className="text-[13px] font-semibold text-error">{t.voucherRefused}</p>
              ) : null}
              <dl className="space-y-1.5 border-t border-hairline pt-3 text-[14.5px]">
                <div className="flex justify-between">
                  <dt>{t.subtotal}</dt>
                  <dd>{formatMoney(quote.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t.shipping}</dt>
                  <dd>{quote.shippingFee === 0 ? t.free : formatMoney(quote.shippingFee)}</dd>
                </div>
                {quote.discount > 0 ? (
                  <div className="flex justify-between text-emerald-ink">
                    <dt>{t.discount}</dt>
                    <dd>−{formatMoney(quote.discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-hairline pt-2 text-[17px] font-semibold">
                  <dt>{t.total}</dt>
                  <dd>{formatMoney(quote.amount)}</dd>
                </div>
              </dl>
              {quote.hasIssues ? (
                <p role="alert" className="text-[13px] font-semibold text-error">
                  {t.changed}{" "}
                  <Link href="/gio-hang" className="underline">
                    {t.backToCart}
                  </Link>
                </p>
              ) : null}
              {!challenge ? (
                <Button
                  type="submit"
                  className="w-full justify-center"
                  disabled={busy || quote.hasIssues}
                >
                  {busy ? t.sending : prefill ? t.submitMember : t.submit}
                </Button>
              ) : null}
              {settings && settings.returnDays > 0 ? (
                <p className="text-[12.5px] text-charcoal/65">{t.returns(settings.returnDays)}</p>
              ) : null}
            </>
          )}
        </aside>
      </form>
    </Container>
  );
}
