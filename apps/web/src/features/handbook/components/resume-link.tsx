"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { FiBookmark } from "react-icons/fi";

import { readerHref } from "../constants/config";
import { TEXT } from "../constants/text";
import { lastPage } from "../storage";

const noop = () => () => {};

/** "Đọc tiếp trang X": only once this device remembers a page past the cover. */
export function ResumeLink({ slug, total }: { slug: string; total: number }) {
  const page = useSyncExternalStore(
    noop,
    () => lastPage(slug),
    () => null,
  );
  if (!page || page <= 1 || page > total) return null;
  return (
    <Link
      href={readerHref(page)}
      className="inline-flex min-h-12 items-center gap-2 rounded-full border border-hairline bg-white px-5 text-sm font-semibold text-deep-blue hover:bg-mint-mist"
    >
      <FiBookmark aria-hidden="true" size={16} className="text-emerald-ink" />
      {TEXT.vi.cover.resume(page)}
    </Link>
  );
}
