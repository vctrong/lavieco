import { Container } from "@lavieco/ui";

import { TEXT } from "../constants/text";

const bone = "rounded-2xl bg-mint-mist motion-safe:animate-pulse";

/** `loading.tsx` of `/chuong-trinh`: the page's shape while the calendar loads. */
export function EventsListSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label={TEXT.vi.list.loading}
      className="bg-soft-white pb-24 pt-dock-clearance"
    >
      <Container className="pt-10 md:pt-14">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <div className={`${bone} h-6 w-28 rounded-full`} />
          <div className={`${bone} h-12 w-3/4`} />
          <div className={`${bone} h-5 w-full`} />
        </div>
        <div className={`${bone} mt-12 aspect-[4/5] w-full rounded-[2rem] sm:aspect-[21/9]`} />
        <div className={`${bone} mt-10 h-14 w-full rounded-full`} />
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="rounded-pedestal border border-hairline bg-white p-3">
              <div className={`${bone} aspect-[4/5] w-full`} />
              <div className={`${bone} mt-4 h-5 w-2/3`} />
              <div className={`${bone} mt-3 h-4 w-1/2`} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
