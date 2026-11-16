import { FiShoppingBag } from "react-icons/fi";

import { TEXT } from "../constants/text";

/** Placeholder until the shop exists (products are evidence, never the message: BR-01). */
export function ShopComingSoon() {
  const t = TEXT.vi;
  return (
    <section className="mx-auto max-w-lg rounded-3xl border border-hairline bg-white p-8 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-mint-mist text-deep-blue">
        <FiShoppingBag aria-hidden="true" size={24} />
      </span>
      <p className="mt-5 inline-flex rounded-full bg-canary/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-museum text-deep-blue">
        {t.badge}
      </p>
      <h1 className="mt-3 font-display text-2xl text-deep-blue">{t.heading}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-charcoal/75">{t.body}</p>
    </section>
  );
}
