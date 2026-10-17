import type { ReactNode } from "react";

type EditorSectionProps = {
  id: string;
  index: number;
  title: string;
  hint?: string;
  aside?: ReactNode;
  children: ReactNode;
};

/** Numbered card of the event editor (layout of "Thiết lập chương trình"). */
export function EditorSection({ id, index, title, hint, aside, children }: EditorSectionProps) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="scroll-mt-24 rounded-3xl border border-hairline bg-white p-5 shadow-ambient md:p-7"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mint-mist font-display text-[15px] text-deep-blue"
          >
            {index}
          </span>
          <div>
            <h2 id={headingId} className="font-display text-xl text-deep-blue">
              {title}
            </h2>
            {hint ? <p className="mt-1 text-[12.5px] text-charcoal/60">{hint}</p> : null}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
