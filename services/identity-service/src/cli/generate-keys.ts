import { randomBytes, randomUUID } from "node:crypto";

import { exportJWK, generateKeyPair } from "jose";

/**
 * `npm run keys:generate -w @lavieco/identity-service`: prints fresh key material for
 * a `.env.local` (development) or the secret store (staging/production). Nothing is
 * written to disk. Each component signing service tokens needs its own key pair:
 * the PRIVATE JWK goes to that component, the PUBLIC JWK to the services it calls.
 */
async function main() {
  const component = process.argv[2] ?? "identity-service";
  const { privateKey, publicKey } = await generateKeyPair("EdDSA", {
    crv: "Ed25519",
    extractable: true,
  });
  const kid = `${component}-${randomUUID().slice(0, 8)}`;
  const privateJwk = { ...(await exportJWK(privateKey)), kid, alg: "EdDSA" };
  const publicJwk = { ...(await exportJWK(publicKey)), kid, alg: "EdDSA" };

  console.log(`# Ed25519 key pair for "${component}" (kid ${kid})`);
  console.log(`PRIVATE_JWK=${JSON.stringify(privateJwk)}`);
  console.log(`PUBLIC_JWK=${JSON.stringify(publicJwk)}`);
  console.log("");
  console.log("# 32-byte random values (TOTP_ENCRYPTION_KEY, OTP_PEPPER, cookie secrets)");
  console.log(`RANDOM_32B_1=${randomBytes(32).toString("base64")}`);
  console.log(`RANDOM_32B_2=${randomBytes(32).toString("base64")}`);
}

void main();
