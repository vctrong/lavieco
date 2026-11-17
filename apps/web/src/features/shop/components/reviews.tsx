"use client";

import { useState } from "react";
import { FiCheckCircle, FiStar } from "react-icons/fi";

import type { ProductReviews, ReviewableOrder } from "@lavieco/shared/shop";
import { Button, Container, FormAlert, TextField, TextareaField, cn } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { submitReview } from "../actions/reviews";
import { TEXT } from "../constants/text";

const t = TEXT.vi.reviews;

function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="inline-flex gap-0.5 text-canary">
      {[1, 2, 3, 4, 5].map((n) => (
        <FiStar
          key={n}
          aria-hidden="true"
          className={cn(n <= Math.round(value) ? "fill-current" : "text-charcoal/25")}
        />
      ))}
    </span>
  );
}

/** Published reviews under a product (BR-24): chosen name, stars, text; never contact details. */
export function ProductReviewsSection({ reviews }: { reviews: ProductReviews }) {
  return (
    <section aria-labelledby="reviews" className="mt-12">
      <h2 id="reviews" className="font-display text-2xl text-deep-blue">
        {t.title}
      </h2>
      {reviews.count === 0 ? (
        <p className="mt-3 text-[14.5px] text-charcoal/70">{t.empty}</p>
      ) : (
        <>
          <p className="mt-2 flex items-center gap-2 text-[14.5px] text-charcoal/80">
            <Stars value={reviews.average} label={t.stars(reviews.average)} />
            {t.average(reviews.average, reviews.count)}
          </p>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {reviews.items.map((review, index) => (
              <li key={index} className="rounded-pedestal border border-hairline bg-white p-5">
                <Stars value={review.rating} label={t.stars(review.rating)} />
                <p className="mt-2 whitespace-pre-line text-[15px] text-charcoal">{review.body}</p>
                <p className="mt-3 text-[13px] text-charcoal/65">
                  {[review.displayName, review.optionLabel].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ReviewForm({ token, item }: { token: string; item: ReviewableOrder["items"][number] }) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error" | "already">(
    item.reviewed ? "already" : "idle",
  );

  const send = async () => {
    setState("busy");
    const result = await callAction(() =>
      submitReview({
        orderToken: token,
        variantId: item.variantId,
        rating,
        body,
        displayName: name,
      }),
    );
    if (result.status === "ok") setState("sent");
    else setState(result.reason === "already" ? "already" : "error");
  };

  if (state === "sent" || state === "already") {
    return (
      <p className="flex items-center gap-2 text-[14.5px] font-semibold text-emerald-ink">
        <FiCheckCircle aria-hidden="true" /> {state === "sent" ? t.sent : t.already}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-1 text-[13.5px] font-semibold text-deep-blue">{t.rating}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={t.stars(n)}
              aria-pressed={rating === n}
              onClick={() => setRating(n)}
              className="grid size-11 place-items-center rounded-full text-canary hover:bg-mint-mist"
            >
              <FiStar
                aria-hidden="true"
                size={22}
                className={cn(n <= rating ? "fill-current" : "text-charcoal/25")}
              />
            </button>
          ))}
        </div>
      </fieldset>
      <TextareaField
        tone="light"
        required
        label={t.body}
        rows={4}
        maxLength={1000}
        value={body}
        disabled={state === "busy"}
        onChange={(e) => setBody(e.target.value)}
      />
      <TextField
        tone="light"
        label={t.name}
        maxLength={60}
        value={name}
        disabled={state === "busy"}
        onChange={(e) => setName(e.target.value)}
      />
      <FormAlert tone="error" message={state === "error" ? t.failed : null} />
      <Button type="button" disabled={state === "busy" || body.trim().length < 3} onClick={send}>
        {t.submit}
      </Button>
    </div>
  );
}

/** `/danh-gia/[token]`: one small form per bought product (BR-24). */
export function ReviewPage({ token, order }: { token: string; order: ReviewableOrder }) {
  return (
    <Container className="py-10 md:py-14">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <p className="text-[12px] font-semibold uppercase tracking-museum text-deep-blue/60">
            {TEXT.vi.order.code(order.publicCode)}
          </p>
          <h1 className="mt-2 font-display text-3xl text-deep-blue md:text-4xl">{t.pageTitle}</h1>
          <p className="mt-3 text-[15px] text-charcoal/80">{t.intro}</p>
        </header>
        {!order.canReview ? (
          <p className="rounded-pedestal border border-hairline bg-white p-6 text-charcoal/80">
            {t.notYet}
          </p>
        ) : (
          <ul className="space-y-5">
            {order.items.map((item) => (
              <li
                key={item.variantId}
                className="space-y-3 rounded-pedestal border border-hairline bg-white p-5"
              >
                <p className="font-display text-xl text-deep-blue">
                  {item.title}
                  {item.optionLabel ? (
                    <span className="ml-2 text-[14px] text-charcoal/65">{item.optionLabel}</span>
                  ) : null}
                </p>
                <ReviewForm token={token} item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
