"use client";

import { useFormStatus } from "react-dom";
import { FiLogOut } from "react-icons/fi";

import { logout } from "../actions/logout";
import { TEXT } from "../constants/text";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = TEXT.vi;
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full border border-deep-blue/20 px-5 py-2.5 text-[13px] font-semibold text-deep-blue transition-colors hover:border-emerald-brand hover:bg-mint-mist disabled:opacity-60"
    >
      <FiLogOut aria-hidden="true" size={15} />
      {pending ? t.loggingOut : t.logout}
    </button>
  );
}

/** Works without JavaScript too (plain form posting to the Server Action). */
export function LogoutButton() {
  return (
    <form action={logout}>
      <SubmitButton />
    </form>
  );
}
