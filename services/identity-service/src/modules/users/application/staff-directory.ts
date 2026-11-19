import type { StaffDirectory } from "@lavieco/shared/identity";

import type { UserRepository } from "./ports/user-repository.port";

/**
 * Names of the active staff accounts, sorted for a picker (ADR-0030: order assignees).
 * Only id and display name leave the service.
 */
export class StaffDirectoryService {
  constructor(private readonly users: UserRepository) {}

  async list(): Promise<StaffDirectory> {
    const staff = await this.users.listActiveStaff();
    return {
      items: staff
        .map((user) => ({ id: user.id, name: user.displayName }))
        .sort((a, b) => a.name.localeCompare(b.name, "vi")),
    };
  }
}
