export const PASSWORD_HASHER = Symbol("PASSWORD_HASHER");
export const SECRET_BOX = Symbol("SECRET_BOX");

/** Argon2id hashing of passwords (docs/02 §9.2). */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
  /** Spends the same time as a real verification when no account matched (no timing oracle). */
  verifyDummy(password: string): Promise<void>;
}

/** Application-level encryption of secrets that must be readable again (TOTP seeds). */
export interface SecretBox {
  seal(plaintext: string): string;
  open(sealed: string): string;
}
