import { Module } from "@nestjs/common";

import { USER_REPOSITORY } from "./application/ports/user-repository.port";
import { userPersistence } from "./infrastructure/user.model";
import { MongoUserRepository } from "./infrastructure/user.repository";

@Module({
  imports: [userPersistence],
  providers: [{ provide: USER_REPOSITORY, useClass: MongoUserRepository }],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
