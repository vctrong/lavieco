import { describe, expect, it } from "vitest";

import {
  ConfigError,
  baseServiceEnvSchema,
  databaseIsolationIssue,
  loadConfig,
} from "./load-config";

const LOCAL_URI = "mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true";
const ATLAS_URI = "mongodb+srv://svc_content:secret@cluster0.abcde.mongodb.net/?retryWrites=true";

describe("databaseIsolationIssue (docs/04 §11.1)", () => {
  it("allows the local compose database in development", () => {
    expect(
      databaseIsolationIssue({
        NODE_ENV: "development",
        MONGODB_URI: LOCAL_URI,
        MONGODB_DB: "lavieco_content",
      }),
    ).toBeNull();
  });

  it("refuses Atlas without a _dev database outside production", () => {
    for (const NODE_ENV of ["development", "test"]) {
      expect(
        databaseIsolationIssue({ NODE_ENV, MONGODB_URI: ATLAS_URI, MONGODB_DB: "lavieco_content" }),
      ).toBe("MONGODB_DB");
    }
  });

  it("allows Atlas with a _dev database in development", () => {
    expect(
      databaseIsolationIssue({
        NODE_ENV: "development",
        MONGODB_URI: ATLAS_URI,
        MONGODB_DB: "lavieco_content_dev",
      }),
    ).toBeNull();
  });

  it("refuses a _dev database in production and accepts the real one", () => {
    const base = { NODE_ENV: "production", MONGODB_URI: ATLAS_URI };
    expect(databaseIsolationIssue({ ...base, MONGODB_DB: "lavieco_content_dev" })).toBe(
      "MONGODB_DB",
    );
    expect(databaseIsolationIssue({ ...base, MONGODB_DB: "lavieco_content" })).toBeNull();
  });

  it("does not mistake a host that merely contains the word for Atlas", () => {
    expect(
      databaseIsolationIssue({
        NODE_ENV: "development",
        MONGODB_URI: "mongodb://mongodb.network.local:27017",
        MONGODB_DB: "lavieco_content",
      }),
    ).toBeNull();
  });
});

describe("loadConfig", () => {
  it("fails fast naming only the variable, never the value", () => {
    const run = () =>
      loadConfig(baseServiceEnvSchema, {
        NODE_ENV: "development",
        PORT: "4002",
        MONGODB_URI: ATLAS_URI,
        MONGODB_DB: "lavieco_content",
      });
    expect(run).toThrow(ConfigError);
    try {
      run();
    } catch (error) {
      expect((error as ConfigError).invalidKeys).toEqual(["MONGODB_DB"]);
      expect((error as Error).message).not.toContain("secret");
    }
  });
});
