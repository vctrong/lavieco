import { describe, expect, it } from "vitest";

import type { User } from "../domain/user";
import type { UserRepository } from "./ports/user-repository.port";
import { StaffDirectoryService } from "./staff-directory";

const user = (id: string, displayName: string) =>
  ({ id, displayName, email: `${id}@lavieco.test` }) as unknown as User;

describe("StaffDirectoryService", () => {
  it("returns id and name only, sorted the Vietnamese way", async () => {
    const users = {
      listActiveStaff: async () => [user("2", "Xuân Anh"), user("1", "Quỳnh"), user("3", "Trọng")],
    } as unknown as UserRepository;
    const { items } = await new StaffDirectoryService(users).list();
    expect(items).toEqual([
      { id: "1", name: "Quỳnh" },
      { id: "3", name: "Trọng" },
      { id: "2", name: "Xuân Anh" },
    ]);
    expect(Object.keys(items[0]!)).toEqual(["id", "name"]);
  });
});
