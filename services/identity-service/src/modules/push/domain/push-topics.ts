import { PUSH_TOPIC_PERMISSIONS, PUSH_TOPICS, type PushTopic } from "@lavieco/shared/identity";
import { permissionsForRoles, type Role } from "@lavieco/shared/permissions";

/** Most devices one person keeps subscribed; the oldest is dropped beyond it. */
export const MAX_DEVICES_PER_USER = 10;

/** Topics a staff member may receive: those whose screen their permissions open. */
export function allowedTopics(roles: readonly Role[]): PushTopic[] {
  const permissions = new Set(permissionsForRoles(roles));
  return PUSH_TOPICS.filter((topic) => permissions.has(PUSH_TOPIC_PERMISSIONS[topic]));
}

/**
 * What a staff member receives. Until they choose (`chosen` null) every allowed topic is
 * on, so a new phone alerts right away; a choice never grants a topic their
 * permissions do not allow (a role change takes effect on the next alert).
 */
export function effectiveTopics(
  roles: readonly Role[],
  chosen: readonly PushTopic[] | null,
): PushTopic[] {
  const allowed = allowedTopics(roles);
  if (chosen === null) return allowed;
  const picked = new Set(chosen);
  return allowed.filter((topic) => picked.has(topic));
}

export function wantsTopic(
  roles: readonly Role[],
  chosen: readonly PushTopic[] | null,
  topic: PushTopic,
): boolean {
  return effectiveTopics(roles, chosen).includes(topic);
}
