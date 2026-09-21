"use client";

import { motion, type Variants } from "motion/react";
import type { CSSProperties } from "react";

import { cn } from "@lavieco/ui";

import { CONTACT_ICONS } from "../constants/contact-channels";
import { CLOSE_MOTION, EASE, OPEN_MOTION } from "../constants/config";
import { TEXT } from "../constants/text";
import { CONTACT_CHANNELS, type TeamMember } from "../types";
import type { ProfilePhase } from "./profile-portrait";

type ProfileDetailsProps = {
  member: TeamMember;
  phase: ProfilePhase;
  reduced: boolean;
  nameId: string;
};

function buildVariants(reduced: boolean) {
  const item: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : 16 },
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

const LABEL_CLASS = "text-[11px] font-medium uppercase tracking-widest text-mint-mist/70";

/** Right column: name, role, quote, bio, story, facts, skills, achievements, contacts. */
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

  const columns = facts.map((fact) => (fact.key === "study" ? "1.4fr" : "1fr")).join(" ");

  return (
    <motion.div
      data-keep-open
      variants={container}
      initial="hidden"
      animate={phase === "closing" ? "exit" : "show"}
      className="flex flex-col gap-6 pt-2 text-soft-white"
    >
      <div className="flex flex-col gap-2">
        <motion.p
          variants={item}
          className="text-xs font-semibold uppercase tracking-[0.24em] text-canary md:text-sm"
        >
          {t.kicker}
        </motion.p>
        <h2
          id={nameId}
          className="text-balance text-5xl leading-[1.08] text-soft-white md:text-6xl lg:text-[68px]"
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
          className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1 text-xs uppercase tracking-wider text-mint-mist/80 md:text-sm"
        >
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full bg-emerald-brand shadow-glow-emerald"
          />
          <span className="font-medium text-emerald-brand">{member.roleShort}</span>
          <span aria-hidden="true">·</span>
          <span className="font-medium text-emerald-brand">{member.roleFull}</span>
        </motion.p>
      </div>

      <motion.blockquote
        variants={item}
        className="font-display text-2xl italic leading-snug text-soft-white md:text-3xl lg:text-[31px]"
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
        className="text-base font-light leading-relaxed text-mint-mist/90 md:text-[16.5px]"
      >
        {member.bio}
      </motion.p>

      <motion.div
        variants={item}
        className="rounded-r-xl border border-l-4 border-soft-white/10 border-l-canary bg-soft-white/5 p-5 md:p-6"
      >
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-canary md:text-xs">
          {t.storyTitle}
        </p>
        <p className="font-display text-base italic leading-relaxed text-soft-white/95 md:text-lg">
          {member.story}
        </p>
      </motion.div>

      {facts.length > 0 ? (
        <motion.dl
          variants={item}
          style={{ "--facts-columns": columns } as CSSProperties}
          className={cn(
            "grid grid-cols-1 divide-y divide-soft-white/10 overflow-hidden rounded-xl border border-soft-white/15 bg-deep-blue/40",
            "md:divide-x md:divide-y-0 md:[grid-template-columns:var(--facts-columns)]",
          )}
        >
          {facts.map((fact) => (
            <div key={fact.key} className="flex flex-col justify-center p-4">
              <dt className={cn(LABEL_CLASS, "mb-1")}>{fact.label}</dt>
              <dd className="text-sm font-semibold text-soft-white">{fact.value}</dd>
              {fact.sub ? (
                <dd className="mt-0.5 text-xs font-light text-mint-mist/70">{fact.sub}</dd>
              ) : null}
            </div>
          ))}
        </motion.dl>
      ) : null}

      {member.skills && member.skills.length > 0 ? (
        <motion.ul variants={item} aria-label={t.skillsLabel} className="flex flex-wrap gap-2.5">
          {member.skills.map((skill) => (
            <li
              key={skill.label}
              data-achievement-id={skill.achievementId}
              className="whitespace-nowrap rounded-full border border-soft-white/20 bg-deep-blue/50 px-4 py-1.5 text-xs font-medium text-mint-mist"
            >
              {skill.label}
            </li>
          ))}
        </motion.ul>
      ) : null}

      {member.achievements && member.achievements.length > 0 ? (
        <motion.div variants={item} className="flex flex-col gap-2.5">
          <p className={cn(LABEL_CLASS, "font-semibold")}>{t.achievementsTitle}</p>
          <ul className="flex flex-col gap-2 text-sm text-soft-white">
            {member.achievements.map((achievement) => (
              <li
                key={achievement.id}
                data-achievement-id={achievement.id}
                className="flex items-start gap-3"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-brand"
                />
                <span>{achievement.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      ) : null}

      {contactLinks.length > 0 ? (
        <motion.ul variants={item} aria-label={t.contactsLabel} className="flex flex-wrap gap-3">
          {contactLinks.map(({ channel, href }) => {
            const Icon = CONTACT_ICONS[channel];
            return (
              <li key={channel}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={TEXT.vi.contactLabels[channel]}
                  className="grid size-11 place-items-center rounded-full border border-soft-white/25 text-mint-mist transition-colors hover:border-canary hover:text-canary"
                >
                  <Icon aria-hidden="true" size={18} />
                </a>
              </li>
            );
          })}
        </motion.ul>
      ) : null}
    </motion.div>
  );
}
