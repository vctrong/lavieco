"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

import { REVIEW_STATUSES, type ReviewList, type ReviewStatus } from "@lavieco/shared/shop";
import { Button, cn, useToast } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { moderateReview } from "../actions/reviews";
import { TEXT } from "../constants/text";
import { failureText } from "../utils/failure";
import { ShopShell } from "./shop-shell";

const t = TEXT.vi.reviews;

/** `/shop/reviews` (BR-24): read, then publish or hide; nothing shows before that. */
export function ReviewsPage({ page, status }: { page: ReviewList; status: ReviewStatus }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const set = async (id: string, next: "published" | "hidden") => {
    setBusy(id);
    const result = await callAction(() => moderateReview(id, next));
    setBusy(null);
    if (result.status === "ok") {
      toast({ tone: "success", message: t.done });
      router.refresh();
    } else toast({ tone: "error", message: failureText(result) });
  };

  return (
    <ShopShell section="reviews" title={t.title} intro={t.intro}>
      <div className="mb-5 flex flex-wrap gap-2">
        {REVIEW_STATUSES.map((value) => (
          <Link
            key={value}
            href={`/shop/reviews?status=${value}`}
            aria-current={status === value ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center rounded-full px-4 text-[13px]",
              status === value
                ? "bg-deep-blue font-semibold text-soft-white"
                : "border border-hairline bg-white text-deep-blue",
            )}
          >
            {t.tabs[value]}
          </Link>
        ))}
      </div>
      {page.items.length === 0 ? (
        <p className="rounded-3xl border border-hairline bg-white px-5 py-14 text-center text-[14px] text-charcoal/60">
          {t.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {page.items.map((review) => (
            <li
              key={review.id}
              className="space-y-2 rounded-3xl border border-hairline bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-deep-blue">
                  {review.productTitle}
                  {review.optionLabel ? (
                    <span className="ml-2 text-[13px] font-normal text-charcoal/65">
                      {review.optionLabel}
                    </span>
                  ) : null}
                </p>
                <span className="text-[13px] font-semibold text-deep-blue">
                  {t.stars(review.rating)}
                </span>
              </div>
              <p className="whitespace-pre-line text-[14.5px] text-charcoal">{review.body}</p>
              <p className="text-[12.5px] text-charcoal/60">{review.displayName}</p>
              <div className="flex gap-2">
                {review.status !== "published" ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy === review.id}
                    onClick={() => void set(review.id, "published")}
                  >
                    <FiEye aria-hidden="true" size={14} />
                    {t.publish}
                  </Button>
                ) : null}
                {review.status !== "hidden" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy === review.id}
                    onClick={() => void set(review.id, "hidden")}
                  >
                    <FiEyeOff aria-hidden="true" size={14} />
                    {t.hide}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ShopShell>
  );
}
