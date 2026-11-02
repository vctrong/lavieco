import Link from "next/link";

import { Container } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import { isValidUnsubscribe } from "../server/unsubscribe";
import { UnsubscribeButton } from "./unsubscribe-button";

const t = TEXT.vi;

/** `/huy-nhan/[token]`: one press, after a look at what it means. */
export async function UnsubscribePage({ token }: { token: string }) {
  const valid = await isValidUnsubscribe(token);
  return (
    <section className="bg-soft-white pb-24 pt-dock-clearance">
      <Container className="max-w-xl pt-12 text-center">
        <h1 className="font-display text-headline-lg-mobile text-deep-blue md:text-headline-lg">
          {valid ? t.title : t.invalidTitle}
        </h1>
        <p className="mt-4 text-body-md text-charcoal/80">{valid ? t.body : t.invalidBody}</p>
        <div className="mt-8">
          {valid ? (
            <UnsubscribeButton token={token} />
          ) : (
            <Link
              href="/"
              className="inline-flex rounded-full bg-emerald-brand px-6 py-3 text-sm font-bold text-charcoal"
            >
              {t.home}
            </Link>
          )}
        </div>
      </Container>
    </section>
  );
}
