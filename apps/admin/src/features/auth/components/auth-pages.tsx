import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/session-cookies";

import { TEXT } from "../constants/text";
import { hasPendingSecondFactor } from "../server/pending-mfa";
import { inspectInvitation } from "../server/inspect-invitation";
import { AcceptInviteForm } from "./accept-invite-form";
import { AuthCard } from "./auth-card";
import { LoginForm } from "./login-form";
import { SecondFactorForm } from "./second-factor-form";

export function StaffLoginPage({ next }: { next?: string }) {
  const t = TEXT.vi.login;
  return (
    <AuthCard title={t.title} intro={t.intro}>
      <LoginForm next={safeNextPath(next)} />
    </AuthCard>
  );
}

export async function SecondFactorPage({ next }: { next?: string }) {
  if (!(await hasPendingSecondFactor())) redirect("/login");
  const t = TEXT.vi.secondFactor;
  return (
    <AuthCard title={t.title} intro={t.intro}>
      <SecondFactorForm next={safeNextPath(next)} />
    </AuthCard>
  );
}

export async function AcceptInvitePage({ token }: { token?: string }) {
  const t = TEXT.vi.invite;
  const invitation = await inspectInvitation(token);
  if (!invitation || !token) {
    return (
      <AuthCard title={t.invalidTitle} intro={t.invalidBody}>
        {null}
      </AuthCard>
    );
  }
  return (
    <AuthCard title={t.title} intro={t.intro} wide>
      <AcceptInviteForm token={token} invitation={invitation} />
    </AuthCard>
  );
}
