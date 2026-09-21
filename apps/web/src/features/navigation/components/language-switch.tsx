import { TEXT } from "../constants/text";

type LanguageSwitchProps = {
  current: "vi" | "en";
};

/**
 * VI / EN toggle. Rendered only when LANGUAGE_SWITCH_ENABLED is true, since EN
 * content and the URL strategy (PQ3) do not exist yet.
 */
export function LanguageSwitch({ current }: LanguageSwitchProps) {
  const t = TEXT.vi;
  return (
    <div role="group" aria-label={t.menu.languageLabel} className="flex items-center gap-3">
      <button
        type="button"
        aria-pressed={current === "vi"}
        className="font-semibold text-canary aria-[pressed=false]:font-normal aria-[pressed=false]:text-mint-mist/75"
      >
        {t.languageSwitch.vi}
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        aria-pressed={current === "en"}
        className="transition-colors hover:text-soft-white aria-[pressed=true]:font-semibold aria-[pressed=true]:text-canary"
      >
        {t.languageSwitch.en}
      </button>
    </div>
  );
}
