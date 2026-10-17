import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { mongo } from "mongoose";

import { loadIdentityEnv } from "../config/env";

type Migration = { up: (db: mongo.Db) => Promise<void> };

export const MIGRATIONS_DIR = resolve(__dirname, "../../migrations");

/**
 * Applies `migrations/*.cjs` in name order and records each in `migrations_applied`
 * (docs/03 §10.1). Migrations are idempotent and never edited once applied; indexes
 * are created here because autoIndex is off in production (docs/03 §10.2).
 */
export async function runMigrations(db: mongo.Db, dir = MIGRATIONS_DIR): Promise<string[]> {
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".cjs"))
    .sort();
  const applied = db.collection<{ _id: string; appliedAt: Date }>("migrations_applied");
  const done = new Set((await applied.find().toArray()).map((doc) => doc._id));
  const ran: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const loaded = (await import(pathToFileURL(resolve(dir, file)).href)) as Partial<Migration> & {
      default?: Migration;
    };
    const up = loaded.up ?? loaded.default?.up;
    if (!up) throw new Error(`Migration ${file} exports no up(db)`);
    await up(db);
    await applied.insertOne({ _id: file, appliedAt: new Date() });
    ran.push(file);
  }
  return ran;
}

/** `npm run db:migrate` */
async function main() {
  const env = loadIdentityEnv();
  const client = new mongo.MongoClient(env.MONGODB_URI);
  await client.connect();
  try {
    const ran = await runMigrations(client.db(env.MONGODB_DB));
    for (const file of ran) console.log(`applied ${file}`);
    console.log("migrations up to date");
  } finally {
    await client.close();
  }
}

if (require.main === module) void main();
