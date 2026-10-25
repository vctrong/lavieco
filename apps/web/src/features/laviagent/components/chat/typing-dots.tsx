import { TEXT } from "../../constants/text";

const DELAYS = ["[animation-delay:0ms]", "[animation-delay:160ms]", "[animation-delay:320ms]"];

/** "LaviAgent is typing": three dots, still (and readable) under reduced motion. */
export function TypingDots() {
  return (
    <span role="status" className="inline-flex items-center gap-1 py-1.5">
      <span className="sr-only">{TEXT.vi.chat.typing}</span>
      {DELAYS.map((delay) => (
        <span
          key={delay}
          aria-hidden="true"
          className={`size-1.5 animate-typing-dot rounded-full bg-emerald-brand ${delay}`}
        />
      ))}
    </span>
  );
}
