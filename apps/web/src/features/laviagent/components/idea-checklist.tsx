"use client";

import { useId, useState } from "react";
import { FiCheck } from "react-icons/fi";

import { cn } from "@lavieco/ui";

/** "Đã có / Cần chuẩn bị": tickable on the spot, kept only in this tab. */
export function IdeaChecklist({
  title,
  items,
  initiallyChecked,
  emptyText,
}: {
  title: string;
  items: string[];
  initiallyChecked: boolean;
  emptyText: string;
}) {
  const baseId = useId();
  const [checked, setChecked] = useState<ReadonlySet<number>>(
    () => new Set(initiallyChecked ? items.map((_, index) => index) : []),
  );

  const toggle = (index: number) =>
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <section className="rounded-[1.5rem] border border-hairline bg-soft-white p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-museum text-charcoal/60">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-charcoal/65">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item, index) => {
            const id = `${baseId}-${index}`;
            const on = checked.has(index);
            return (
              <li key={item}>
                <label
                  htmlFor={id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-1 text-sm text-charcoal hover:bg-mint-mist/50"
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(index)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-brand",
                      on
                        ? "border-emerald-brand bg-emerald-brand text-soft-white"
                        : "border-deep-blue/30",
                    )}
                  >
                    {on ? <FiCheck size={13} /> : null}
                  </span>
                  <span
                    className={cn(
                      on && "text-charcoal/60 line-through decoration-emerald-brand/60",
                    )}
                  >
                    {item}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
