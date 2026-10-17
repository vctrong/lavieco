import "server-only";

import type { DownloadedFile } from "@lavieco/api-clients";

import { callStaff, stepUpToken } from "./call";

/**
 * Excel export of the registrations (ADR-0017): step-up with the TOTP code, then the
 * file from program-service, which audits the export itself.
 */
export function exportRegistrations(eventId: string, code: string, includeRefunded: boolean) {
  return callStaff<DownloadedFile>(
    "registrations.export",
    async ({ program, identity }, token, id) => {
      const stepUp = await stepUpToken(identity, token, code, id);
      return program.exportRegistrations(
        token,
        eventId,
        { includeRefunded, stepUpToken: stepUp },
        id,
      );
    },
  );
}
