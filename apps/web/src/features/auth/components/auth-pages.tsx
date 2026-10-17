import { safeNextPath } from "@/lib/session-cookies";

import { TEXT } from "../constants/text";
import { authPageOptions } from "../server/page-options";
import { AuthShell } from "./auth-shell";
import { LoginForm } from "./login-form";
import { messageForUrlError } from "./messages";
import { ResetFlow } from "./reset-flow";
import { SignupFlow } from "./signup-flow";

/** Search params the auth pages understand (`?tiep=/...&loi=...`). */
export type AuthSearchParams = { tiep?: string; loi?: string };

export async function LoginPage({ searchParams }: { searchParams: AuthSearchParams }) {
  const t = TEXT.vi.login;
  const options = await authPageOptions();
  return (
    <AuthShell title={t.title} intro={t.intro}>
      <LoginForm
        next={safeNextPath(searchParams.tiep)}
        googleEnabled={options.googleEnabled}
        turnstileSiteKey={options.turnstileSiteKey}
        urlError={messageForUrlError(searchParams.loi)}
      />
    </AuthShell>
  );
}

export async function SignupPage({ searchParams }: { searchParams: AuthSearchParams }) {
  const t = TEXT.vi.signup;
  const options = await authPageOptions();
  return (
    <AuthShell title={t.title} intro={t.intro}>
      <SignupFlow
        next={safeNextPath(searchParams.tiep)}
        googleEnabled={options.googleEnabled}
        turnstileSiteKey={options.turnstileSiteKey}
        urlError={messageForUrlError(searchParams.loi)}
      />
    </AuthShell>
  );
}

export async function ResetPasswordPage() {
  const t = TEXT.vi.reset;
  return (
    <AuthShell title={t.title} intro={t.intro}>
      <ResetFlow turnstileSiteKey={(await authPageOptions()).turnstileSiteKey} />
    </AuthShell>
  );
}
