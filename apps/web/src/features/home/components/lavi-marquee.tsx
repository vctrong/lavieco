import { Marquee } from "@lavieco/ui";

import { MARQUEE_REPEAT } from "../constants/config";
import { TEXT } from "../constants/text";

const ITEM_CLASS = "px-4";

function WordItem({ word }: { word: string }) {
  return (
    <span className={`${ITEM_CLASS} font-bold text-soft-white`}>
      <span className="text-canary">{word.slice(0, 1)}</span>
      {word.slice(1)}
    </span>
  );
}

/** "LAVI" ticker at the bottom of the hero: LIFE · ART · VALUE · INNOVATION · ECO. */
export function LaviMarquee() {
  const t = TEXT.vi.marquee;
  return (
    <div className="relative z-10 h-11 shrink-0 overflow-hidden border-t border-hairline-light bg-deep-blue">
      <p className="sr-only">{t.screenReaderText}</p>
      <Marquee repeat={MARQUEE_REPEAT} className="flex h-full items-center">
        {t.taglines.flatMap((tagline) => [
          ...t.words.flatMap((word) => [
            <WordItem key={`${tagline}-${word}`} word={word} />,
            <span key={`${tagline}-${word}-sep`} className={`${ITEM_CLASS} text-canary`}>
              {t.separator}
            </span>,
          ]),
          <span key={`${tagline}-text`} className={`${ITEM_CLASS} font-medium text-mint-mist/80`}>
            {tagline}
          </span>,
          <span key={`${tagline}-end`} className={`${ITEM_CLASS} text-canary`}>
            {t.separator}
          </span>,
        ])}
      </Marquee>
    </div>
  );
}
