"use client";

import { useCallback, useState } from "react";

import type { TeamMember } from "../types";
import { MemberCard } from "./member-card";
import { ProfileModal, type ProfileSession } from "./profile-modal";

type TeamGridProps = {
  members: readonly TeamMember[];
};

/** The six cards plus the profile modal they open. Owns which profile is open. */
export function TeamGrid({ members }: TeamGridProps) {
  const [session, setSession] = useState<ProfileSession | null>(null);

  const handleOpen = useCallback((member: TeamMember, trigger: HTMLElement) => {
    setSession({ member, trigger });
  }, []);

  const handleClosed = useCallback(() => {
    const trigger = session?.trigger;
    setSession(null);
    // Return focus to the card that was clicked.
    window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
  }, [session]);

  return (
    <>
      <ul className="grid grid-cols-1 items-start gap-8 md:grid-cols-3 lg:gap-10">
        {members.map((member, index) => (
          <MemberCard key={member.slug} member={member} index={index} onOpen={handleOpen} />
        ))}
      </ul>
      {session ? (
        <ProfileModal key={session.member.slug} session={session} onClosed={handleClosed} />
      ) : null}
    </>
  );
}
