import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { mongo } from "mongoose";

import { createLogger } from "@lavieco/observability";
import { UNIT_OF_WORK, type UnitOfWork } from "@lavieco/service-kit";
import { normalizeEmail } from "@lavieco/shared";

import { AppModule } from "../app.module";
import { loadIdentityEnv } from "../config/env";
import {
  PASSWORD_HASHER,
  SECRET_BOX,
  checkPassword,
  type PasswordHasher,
  type SecretBox,
} from "../modules/security";
import { USER_REPOSITORY, type UserRepository } from "../modules/users";
import { DEV_CONSENT_VERSION, DEV_MEMBERS, DEV_STAFF } from "./dev-accounts";
import { devDatabaseIssue } from "./dev-guard";

/**
 * `npm run dev:seed`: development accounts in the LOCAL MongoDB (docs/dev-local.md).
 * Idempotent: a missing account is created; an existing one only gets its seed
 * password back (and its lockout cleared), so running it twice never duplicates.
 * Refuses to run unless NODE_ENV=development and MongoDB is on this machine.
 */
async function main() {
  const env = loadIdentityEnv();
  const issue = devDatabaseIssue(env);
  if (issue) {
    console.error(`dev:seed refused: ${issue}. It only writes into a local development database.`);
    process.exit(2);
  }

  // Fail fast with a hint instead of waiting forever (the dev app waits for the database).
  const probe = new mongo.MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 5_000 });
  try {
    await probe.connect();
    await probe.db(env.MONGODB_DB).command({ ping: 1 });
  } catch {
    console.error("dev:seed: MongoDB is not reachable. Start it with: npm run dev:infra");
    process.exit(1);
  } finally {
    await probe.close().catch(() => undefined);
  }

  const logger = createLogger({ service: "identity-service", level: "warn" });
  const app = await NestFactory.createApplicationContext(
    AppModule.forRoot(env, { logger, outbox: { runWorker: false } }),
    { logger: false },
  );
  try {
    const users = app.get<UserRepository>(USER_REPOSITORY);
    const hasher = app.get<PasswordHasher>(PASSWORD_HASHER);
    const secretBox = app.get<SecretBox>(SECRET_BOX);
    const unitOfWork = app.get<UnitOfWork>(UNIT_OF_WORK);
    const now = new Date();

    for (const account of [...DEV_STAFF, ...DEV_MEMBERS]) {
      const emailNormalized = normalizeEmail(account.email);
      if (!checkPassword(account.password, emailNormalized).ok) {
        throw new Error(`Seed password of ${account.email} breaks the password policy`);
      }
    }

    for (const staff of DEV_STAFF) {
      const emailNormalized = normalizeEmail(staff.email);
      const passwordHash = await hasher.hash(staff.password);
      const existing = await users.findByEmail(emailNormalized);
      if (existing) {
        await users.setPassword(existing.id, passwordHash);
        console.log(`staff  ${staff.email}: exists, password reset`);
        continue;
      }
      // Same two steps as an accepted invitation: invited, then activated with 2FA.
      const invited = await users.insert({
        type: "staff",
        email: staff.email,
        emailNormalized,
        displayName: staff.displayName,
        roles: staff.roles,
        status: "invited",
        passwordHash: null,
        googleSub: null,
        emailVerifiedAt: null,
        consent: null,
        createdBy: "cli:dev-seed",
      });
      await unitOfWork.run((tx) =>
        users.activateStaff(
          invited.id,
          {
            displayName: staff.displayName,
            passwordHash,
            totpSecretEnc: secretBox.seal(staff.totpSecret),
            // No step used yet: the current code is accepted right away.
            totpStep: 0,
            recoveryCodeHashes: [],
            at: now,
          },
          tx,
        ),
      );
      console.log(`staff  ${staff.email}: created (${staff.roles.join(", ")})`);
    }

    for (const member of DEV_MEMBERS) {
      const emailNormalized = normalizeEmail(member.email);
      const passwordHash = await hasher.hash(member.password);
      const existing = await users.findByEmail(emailNormalized);
      if (existing) {
        await users.setPassword(existing.id, passwordHash);
        console.log(`member ${member.email}: exists, password reset`);
        continue;
      }
      await users.insert({
        type: "member",
        email: member.email,
        emailNormalized,
        displayName: member.displayName,
        roles: [],
        status: "active",
        passwordHash,
        googleSub: null,
        emailVerifiedAt: now,
        consent: { version: DEV_CONSENT_VERSION, at: now },
        createdBy: "cli:dev-seed",
      });
      console.log(`member ${member.email}: created`);
    }
    console.log("dev:seed done. Passwords and 2FA: docs/dev-local.md (codes: npm run dev:totp).");
  } finally {
    await app.close();
  }
}

void main();
