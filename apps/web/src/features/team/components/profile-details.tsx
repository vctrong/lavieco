"use client";

import { motion, type Variants } from "motion/react";

import { cn } from "@lavieco/ui";

import { CONTACT_ICONS } from "../constants/contact-channels";
import { CLOSE_MOTION, EASE, OPEN_MOTION, PROFILE_SCALE } from "../constants/config";
import { TEXT } from "../constants/text";
import { CONTACT_CHANNELS, type TeamMember } from "../types";
import { HandwrittenNote } from "./handwritten-note";
import type { ProfilePhase } from "./profile-portrait";

type ProfileDetailsProps = {
  member: TeamMember;
  phase: ProfilePhase;
  reduced: boolean;
  nameId: string;
};

function buildVariants(reduced: boolean) {
  const item: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? OPEN_MOTION.reduced : OPEN_MOTION.item, ease: EASE },
    },
    exit: { opacity: 0, transition: { duration: CLOSE_MOTION.content } },
  };
  const container: Variants = {
    hidden: {},
    show: {
      transition: reduced
        ? {}
        : { delayChildren: OPEN_MOTION.textStart, staggerChildren: OPEN_MOTION.stagger },
    },
    exit: { transition: { staggerChildren: 0 } },
  };
  return { item, container };
}

const LABEL_CLASS = cn(
  "font-medium uppercase tracking-widest text-mint-mist/70",
  PROFILE_SCALE.label,
);

/**
 * Text column: name, role, quote, bio, story, facts, skills, achievements, contacts.
 * Two sub-columns when the column is wide enough (container query on `text`), so the
 * profile stays short enough to fit the screen.
 */
export function ProfileDetails({ member, phase, reduced, nameId }: ProfileDetailsProps) {
  const t = TEXT.vi.profile;
  const { item, container } = buildVariants(reduced);

  const quoteAt = member.quote.indexOf(member.quoteHighlight);
  const hasHighlight = member.quoteHighlight !== "" && quoteAt >= 0;
  const quoteBefore = hasHighlight ? member.quote.slice(0, quoteAt) : member.quote;
  const quoteAfter = hasHighlight ? member.quote.slice(quoteAt + member.quoteHighlight.length) : "";
  const underlineDelay = OPEN_MOTION.textStart + OPEN_MOTION.stagger * 3;

  const facts: { key: string; label: string; value: string; sub: string }[] = [];
  if (member.education) {
    facts.push({
      key: "study",
      label: t.studyLabel,
      value: member.education.school,
      sub: `${member.education.major} · ${member.education.cohort}`,
    });
  }
  if (member.hometown) {
    facts.push({ key: "hometown", label: t.hometownLabel, value: member.hometown, sub: "" });
  }
  if (member.location) {
    facts.push({ key: "location", label: t.locationLabel, value: member.location, sub: "" });
  }

  const contactLinks = CONTACT_CHANNELS.flatMap((channel) => {
    const href = member.contacts?.[channel];
    return href ? [{ channel, href }] : [];
  });

  return (
    <motion.div
      data-keep-open
      variants={container}
      initial="hidden"
      animate={phase === "closing" ? "exit" : "show"}
      className={cn("flex min-h-full flex-col justify-center text-soft-white", PROFILE_SCALE.gap)}
    >
      <div className="flex flex-col gap-[clamp(0.15rem,0.8cqh,0.5rem)]">
        <motion.p
          variants={item}
          className={cn(
            "font-semibold uppercase tracking-[0.24em] text-canary",
            PROFILE_SCALE.kicker,
          )}
        >
          {t.kicker}
        </motion.p>
        <h2
          id={nameId}
          className={cn("text-balance leading-[1.08] text-soft-white", PROFILE_SCALE.name)}
        >
          {member.nameLines.map((line) => (
            <motion.span
              key={line}
              variants={item}
              className="block font-display font-normal italic"
            >
              {line}
            </motion.span>
          ))}
        </h2>
        <motion.p
          variants={item}
          className={cn(
            "flex flex-wrap items-center gap-x-2 gap-y-0.5 uppercase tracking-wider text-mint-mist/80",
            PROFILE_SCALE.role,
          )}
        >
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-emerald-brand shadow-glow-emerald"
          />
          <span className="font-medium text-emerald-brand">{member.roleShort}</span>
          <span aria-hidden="true">·</span>
          <span className="font-medium text-emerald-brand">{member.roleFull}</span>
        </motion.p>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 @xl/text:grid-cols-2 @xl/text:items-start",
          PROFILE_SCALE.gap,
          "@xl/text:gap-x-[clamp(1rem,2.6cqh,2rem)]",
        )}
      >
        <div className={cn("flex flex-col", PROFILE_SCALE.gap)}>
          <motion.blockquote
            variants={item}
            className={cn("font-display italic leading-snug text-soft-white", PROFILE_SCALE.quote)}
          >
            <p>
              {quoteBefore}
              {hasHighlight ? (
                <span className="relative inline-block font-medium">
                  {member.quoteHighlight}
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-0.5 h-[3px] origin-left rounded-full bg-canary"
                    initial={{ scaleX: reduced ? 1 : 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      delay: reduced ? 0 : underlineDelay,
                      duration: reduced ? OPEN_MOTION.reduced : OPEN_MOTION.underlineDuration,
                      ease: EASE,
                    }}
                  />
                </span>
              ) : null}
              {quoteAfter}
            </p>
          </motion.blockquote>

          <motion.p
            variants={item}
            className={cn("font-light leading-relaxed text-mint-mist/90", PROFILE_SCALE.body)}
          >
            {member.bio}
          </motion.p>

          <motion.div
            variants={item}
            className="rounded-r-xl border border-l-4 border-soft-white/10 border-l-canary bg-soft-white/5 p-[clamp(0.6rem,1.9cqh,1.25rem)]"
          >
            <p
              className={cn(
                "mb-1 font-bold uppercase tracking-[0.2em] text-canary",
                PROFILE_SCALE.label,
              )}
            >
              {t.storyTitle}
            </p>
            <p
              className={cn(
                "font-display italic leading-relaxed text-soft-white/95",
                PROFILE_SCALE.story,
              )}
            >
              {member.story}
            </p>
          </motion.div>

          {member.notes && member.notes.length > 0 ? (
            <motion.div variants={item} className="flex flex-col gap-[clamp(0.25rem,1cqh,0.6rem)]">
              {member.notes.slice(0, 2).map((note) => (
                <HandwrittenNote
                  key={note.side}
                  note={note}
                  animated={!reduced}
                  closing={phase === "closing"}
                />
              ))}
            </motion.div>
          ) : null}
        </div>

        <div className={cn("flex flex-col", PROFILE_SCALE.gap)}>
          {facts.length > 0 ? (
            <motion.dl
              variants={item}
              className="divide-y divide-soft-white/10 overflow-hidden rounded-xl border border-soft-white/15 bg-deep-blue/40"
            >
              {facts.map((fact) => (
                <div
                  key={fact.key}
                  className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-3 px-3 py-[clamp(0.3rem,1cqh,0.6rem)]"
                >
                  <dt className={LABEL_CLASS}>{fact.label}</dt>
                  <dd className={cn("font-semibold text-soft-white", PROFILE_SCALE.chip)}>
                    {fact.value}
                    {fact.sub ? (
                      <span className="block font-light text-mint-mist/70">{fact.sub}</span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </motion.dl>
          ) : null}

          {member.skills && member.skills.length > 0 ? (
            <motion.ul
              variants={item}
              aria-label={t.skillsLabel}
              className="flex flex-wrap gap-[clamp(0.3rem,1cqh,0.6rem)]"
            >
              {member.skills.map((skill) => (
                <li
                  key={skill.label}
                  data-achievement-id={skill.achievementId}
                  className={cn(
                    "whitespace-nowrap rounded-full border border-soft-white/20 bg-deep-blue/50 px-3 py-[clamp(0.15rem,0.7cqh,0.375rem)] font-medium text-mint-mist",
                    PROFILE_SCALE.chip,
                  )}
                >
                  {skill.label}
                </li>
              ))}
            </motion.ul>
          ) : null}

          {member.achievements && member.achievements.length > 0 ? (
            <motion.div
              variants={item}
              className="flex flex-col gap-[clamp(0.25rem,0.9cqh,0.6rem)]"
            >
              <p className={cn(LABEL_CLASS, "font-semibold")}>{t.achievementsTitle}</p>
              <ul
                className={cn(
                  "flex flex-col gap-[clamp(0.2rem,0.8cqh,0.5rem)] text-soft-white",
                  PROFILE_SCALE.chip,
                )}
              >
                {member.achievements.map((achievement) => (
                  <li
                    key={achievement.id}
                    data-achievement-id={achievement.id}
                    className="flex items-start gap-2.5"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.45em] size-1.5 shrink-0 rounded-full bg-emerald-brand"
                    />
                    <span>{achievement.text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : null}

          {contactLinks.length > 0 ? (
            <motion.ul
              variants={item}
              aria-label={t.contactsLabel}
              className="flex flex-wrap gap-2.5"
            >
              {contactLinks.map(({ channel, href }) => {
                const Icon = CONTACT_ICONS[channel];
                return (
                  <li key={channel}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={TEXT.vi.contactLabels[channel]}
                      className="grid size-[clamp(2rem,4.6cqh,2.75rem)] place-items-center rounded-full border border-soft-white/25 text-mint-mist transition-colors hover:border-canary hover:text-canary"
                    >
                      <Icon aria-hidden="true" size={16} />
                    </a>
                  </li>
                );
              })}
            </motion.ul>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
