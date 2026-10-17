import Link from "next/link";
import { redirect } from "next/navigation";
import { FiArrowRight, FiCheckCircle, FiCircle } from "react-icons/fi";

import { Button, Container, Eyebrow, PearlDot } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import { getAccountState } from "../server/get-account";
import { AvatarField } from "./avatar-field";
import { LogoutButton } from "./logout-button";

const ACCOUNT_PATH = "/tai-khoan";
const DATE_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

/**
 * Member space (docs/05). Phase 1 shows the profile; the ticket list arrives with
 * ticketing (docs/05 §9, Phase 6). The real access check happens in identity-service.
 */
export async function AccountPage() {
  const state = await getAccountState();
  if (state.kind === "needs_refresh") redirect(`/api/auth/refresh?tiep=${ACCOUNT_PATH}`);
  if (state.kind === "anonymous") redirect(`/dang-nhap?tiep=${ACCOUNT_PATH}`);

  const t = TEXT.vi;
  const { profile } = state;
  const signInMethods = [
    ...(profile.hasPassword ? [t.profile.password] : []),
    ...(profile.googleLinked ? [t.profile.google] : []),
  ].join(" · ");

  return (
    <section className="bg-soft-white pt-dock-clearance pb-24">
      <Container className="pt-8 md:pt-14">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow className="mb-4 flex items-center gap-2">
              <PearlDot size="sm" tone="emerald" />
              {t.eyebrow}
            </Eyebrow>
            <h1 className="font-display text-4xl leading-tight text-deep-blue md:text-5xl">
              {t.greeting} <em className="text-emerald-brand">{profile.displayName}</em>
            </h1>
          </div>
          <LogoutButton />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <article className="rounded-3xl border border-hairline bg-white p-6 shadow-ambient md:p-8">
            <h2 className="mb-6 font-display text-2xl text-deep-blue">{t.profile.title}</h2>
            <div className="mb-6 border-b border-hairline pb-6">
              <p className="mb-3 text-[11px] uppercase tracking-museum text-deep-blue/60">
                {t.avatar.title}
              </p>
              <AvatarField avatar={state.avatar} />
            </div>
            <dl className="space-y-5 text-sm">
              <div>
                <dt className="mb-1 text-[11px] uppercase tracking-museum text-deep-blue/60">
                  {t.profile.email}
                </dt>
                <dd className="flex flex-wrap items-center gap-2 text-charcoal">
                  <span className="break-all">{profile.email}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-mint-mist px-2.5 py-0.5 text-[11px] font-semibold text-deep-blue">
                    {profile.emailVerifiedAt ? (
                      <FiCheckCircle aria-hidden="true" size={12} className="text-emerald-brand" />
                    ) : (
                      <FiCircle aria-hidden="true" size={12} />
                    )}
                    {profile.emailVerifiedAt ? t.profile.verified : t.profile.notVerified}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[11px] uppercase tracking-museum text-deep-blue/60">
                  {t.profile.signIn}
                </dt>
                <dd className="text-charcoal">{signInMethods}</dd>
              </div>
              <div>
                <dt className="mb-1 text-[11px] uppercase tracking-museum text-deep-blue/60">
                  {t.profile.memberSince}
                </dt>
                <dd className="text-charcoal">{DATE_FORMAT.format(new Date(profile.createdAt))}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-3xl border border-hairline bg-white p-6 shadow-ambient md:p-8">
            <h2 className="mb-6 font-display text-2xl text-deep-blue">{t.tickets.title}</h2>
            <div className="scallop-pattern rounded-2xl px-6 py-10 text-center">
              <p className="mb-2 font-display text-xl text-deep-blue">{t.tickets.emptyTitle}</p>
              <p className="mx-auto mb-6 max-w-md text-[13.5px] leading-relaxed text-charcoal/75">
                {t.tickets.emptyBody}
              </p>
              <Button as={Link} href="/chuong-trinh" size="sm">
                {t.tickets.cta}
                <FiArrowRight aria-hidden="true" size={14} />
              </Button>
            </div>
          </article>
        </div>
      </Container>
    </section>
  );
}
