import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { parseArgs } from "node:util";

import { createLogger } from "@lavieco/observability";
import { emailSchema, displayNameSchema } from "@lavieco/shared/identity";

import { AppModule } from "../app.module";
import { loadIdentityEnv } from "../config/env";
import { INVITATION_SERVICE, type InvitationService } from "../modules/invitations";
import { USER_REPOSITORY, type UserRepository } from "../modules/users";

/**
 * One-time command creating the first Super Admin (CLAUDE §11: no default account
 * in seeds). It creates an INVITED account and prints a single-use link; the person
 * sets a password AND sets up TOTP before the account works.
 *
 *   npm run admin:create -- --email cto@lavieco.io.vn --name "Võ Chí Trọng"
 */
async function main() {
  const { values } = parseArgs({
    options: { email: { type: "string" }, name: { type: "string" } },
  });
  const email = emailSchema.safeParse(values.email);
  const name = displayNameSchema.safeParse(values.name);
  if (!email.success || !name.success) {
    console.error('Usage: npm run admin:create -- --email <email> --name "<display name>"');
    process.exit(2);
  }

  const env = loadIdentityEnv();
  const logger = createLogger({ service: "identity-service", level: "warn" });
  const app = await NestFactory.createApplicationContext(
    AppModule.forRoot(env, { logger, outbox: { runWorker: false } }),
    { logger: false },
  );
  try {
    const users = app.get<UserRepository>(USER_REPOSITORY);
    if (await users.findByEmail(email.data.toLowerCase())) {
      console.error("An account with this email already exists. Nothing was changed.");
      process.exitCode = 1;
      return;
    }
    const invitations = app.get<InvitationService>(INVITATION_SERVICE);
    const { token, expiresAt } = await invitations.create({
      email: email.data,
      displayName: name.data,
      roles: ["super_admin"],
      invitedBy: "cli:admin-create",
    });
    const link = new URL("/accept-invite", env.ADMIN_APP_URL);
    link.searchParams.set("token", token);
    console.log("Super Admin invited. Open this single-use link to set the password and 2FA:");
    console.log(link.toString());
    console.log(`The link expires at ${expiresAt.toISOString()}. Do not share it.`);
  } finally {
    await app.close();
  }
}

void main();
