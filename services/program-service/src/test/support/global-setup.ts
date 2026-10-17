import { MongoDBContainer, type StartedMongoDBContainer } from "@testcontainers/mongodb";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

let container: StartedMongoDBContainer | undefined;

/**
 * One MongoDB replica set (transactions need it) for the whole integration run.
 * Each test file uses its own database on it. Fixtures never use real data.
 */
export async function setup(project: TestProject) {
  container = await new MongoDBContainer("mongo:8.0").start();
  project.provide("mongoUri", `${container.getConnectionString()}?directConnection=true`);
}

export async function teardown() {
  await container?.stop();
}
