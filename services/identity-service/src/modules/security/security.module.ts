import { Global, Module } from "@nestjs/common";

import { SERVICE_CONFIG } from "@lavieco/service-kit";

import type { IdentityEnv } from "../../config/env";
import { PASSWORD_HASHER, SECRET_BOX } from "./application/ports/security.port";
import { AesSecretBox } from "./infrastructure/aes-secret-box";
import { Argon2PasswordHasher } from "./infrastructure/argon2-password-hasher";

@Global()
@Module({
  providers: [
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    {
      provide: SECRET_BOX,
      useFactory: (env: IdentityEnv) => new AesSecretBox(env.TOTP_ENCRYPTION_KEY),
      inject: [SERVICE_CONFIG],
    },
  ],
  exports: [PASSWORD_HASHER, SECRET_BOX],
})
export class SecurityModule {}
