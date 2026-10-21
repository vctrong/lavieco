import { describe, expect, it } from "vitest";

import { DEV_MEMBERS, DEV_STAFF } from "./dev-accounts";
import { devDatabaseIssue } from "./dev-guard";
import { checkPassword } from "../modules/security";

const LOCAL = "mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true";

describe("devDatabaseIssue", () => {
  it("accepts a local database in development", () => {
    expect(devDatabaseIssue({ NODE_ENV: "development", MONGODB_URI: LOCAL })).toBeNull();
    expect(
      devDatabaseIssue({ NODE_ENV: "development", MONGODB_URI: "mongodb://localhost:27017/x" }),
    ).toBeNull();
    expect(
      devDatabaseIssue({ NODE_ENV: "development", MONGODB_URI: "mongodb://u:p@[::1]:27017" }),
    ).toBeNull();
  });

  it("refuses outside development", () => {
    expect(devDatabaseIssue({ NODE_ENV: "production", MONGODB_URI: LOCAL })).not.toBeNull();
    expect(devDatabaseIssue({ NODE_ENV: "test", MONGODB_URI: LOCAL })).not.toBeNull();
    expect(devDatabaseIssue({ MONGODB_URI: LOCAL })).not.toBeNull();
  });

  it("refuses Atlas and any remote host", () => {
    for (const uri of [
      "mongodb+srv://u:p@cluster0.abcde.mongodb.net/?retryWrites=true",
      "mongodb://u:p@cluster0-shard-00-00.abcde.mongodb.net:27017/",
      "mongodb://127.0.0.1:27017,db.example.com:27017/?replicaSet=rs0",
      "mongodb://localhost.evil.example:27017/",
      "mongodb://127.0.0.1@db.example.com:27017/",
      "",
    ]) {
      expect(devDatabaseIssue({ NODE_ENV: "development", MONGODB_URI: uri })).not.toBeNull();
    }
  });

  it("never echoes the URI (it may hold a password)", () => {
    const uri = "mongodb+srv://user:s3cr3t@cluster0.mongodb.net/";
    expect(devDatabaseIssue({ NODE_ENV: "development", MONGODB_URI: uri })).not.toContain("s3cr3t");
  });
});

describe("dev accounts", () => {
  it("only use the .test domain and pass the password policy", () => {
    for (const account of [...DEV_STAFF, ...DEV_MEMBERS]) {
      expect(account.email.endsWith("@lavieco.test")).toBe(true);
      expect(checkPassword(account.password, account.email)).toEqual({ ok: true });
    }
  });

  it("give every staff member a valid base32 TOTP secret of 20 bytes", () => {
    for (const staff of DEV_STAFF) expect(staff.totpSecret).toMatch(/^[A-Z2-7]{32}$/);
  });
});
