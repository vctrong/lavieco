import { Module } from "@nestjs/common";

import { StaffDirectoryController } from "./api/staff-directory.controller";
import { USER_REPOSITORY, type UserRepository } from "./application/ports/user-repository.port";
import { StaffDirectoryService } from "./application/staff-directory";
import { userPersistence } from "./infrastructure/user.model";
import { MongoUserRepository } from "./infrastructure/user.repository";
import { STAFF_DIRECTORY_SERVICE } from "./users.tokens";

@Module({
  imports: [userPersistence],
  controllers: [StaffDirectoryController],
  providers: [
    { provide: USER_REPOSITORY, useClass: MongoUserRepository },
    {
      provide: STAFF_DIRECTORY_SERVICE,
      useFactory: (users: UserRepository) => new StaffDirectoryService(users),
      inject: [USER_REPOSITORY],
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
