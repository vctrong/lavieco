// Compares every `.env.local` with its `.env.example` (root and each workspace project)
// and reports, by NAME only, the variables that are missing or still empty, and a dev
// setup pointing at a production database. Values are never printed. Exit code 1 when
// something needs attention, so it can gate scripts. Also warns (without failing) about
// variables of a `.env.example` that docs/06-bien-moi-truong.md does not mention yet.
//
//   npm run env:check          report only
//   npm run env:check -- --fix append missing variables whose example has a default
//                              (never touches a variable that already exists)
import { appendFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const fix = process.argv.includes("--fix");
const projectDirs = [".", ...["apps", "services", "packages"].flatMap(listChildren)];

function listChildren(group) {
  const dir = join(root, group);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(group, entry.name));
}

/** `NAME=value` lines in order; comments and blank lines skipped. Quotes kept as written. */
function parse(file) {
  const entries = new Map();
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=(.*)$/.exec(line);
    if (match) entries.set(match[1], match[2].trim());
  }
  return entries;
}

/** Quotes as written in a .env file are not part of the value. */
const unquote = (value) => (value ?? "").replace(/^(['"])(.*)\1$/, "$2");

/**
 * Same rule as `databaseIsolationIssue` in @lavieco/service-kit (docs/04 §11.1):
 * outside production, Atlas only with a `_dev` database; production never `_dev`.
 * Returns the offending variable NAME, never its value.
 */
function databaseIsolationIssue(local) {
  const uri = unquote(local.get("MONGODB_URI"));
  const db = unquote(local.get("MONGODB_DB"));
  if (!uri || !db) return null;
  const devDatabase = db.endsWith("_dev");
  if (unquote(local.get("NODE_ENV")) === "production") return devDatabase ? "MONGODB_DB" : null;
  return /\.mongodb\.net(?=[:/,?]|$)/i.test(uri) && !devDatabase ? "MONGODB_DB" : null;
}

const envDocPath = join(root, "docs", "06-bien-moi-truong.md");
const envDoc = existsSync(envDocPath) ? readFileSync(envDocPath, "utf8") : null;
/** Variables named in `.env.example` files but absent from the env documentation. */
const undocumented = [];

const isEmpty = (value) => value === undefined || value === "" || value === "''" || value === '""';

let problems = 0;
for (const dir of projectDirs) {
  const examplePath = join(root, dir, ".env.example");
  if (!existsSync(examplePath)) continue;
  const localPath = join(root, dir, ".env.local");
  const label = dir === "." ? "(root)" : dir.replaceAll("\\", "/");
  const example = parse(examplePath);
  if (envDoc !== null) {
    for (const key of example.keys()) {
      if (!envDoc.includes(`\`${key}\``)) undocumented.push(`${label}: ${key}`);
    }
  }
  if (!existsSync(localPath)) {
    process.stdout.write(`✗ ${label}: no .env.local (run npm run env:init)\n`);
    problems += 1;
    continue;
  }
  const local = parse(localPath);
  const missing = [...example.keys()].filter((key) => !local.has(key));
  const appended = [];
  if (fix) {
    const lines = missing
      .filter((key) => !isEmpty(example.get(key)))
      .map((key) => {
        appended.push(key);
        return `${key}=${example.get(key)}`;
      });
    if (lines.length > 0) {
      const text = readFileSync(localPath, "utf8");
      const separator = text.endsWith("\n") || text === "" ? "" : "\n";
      appendFileSync(localPath, `${separator}\n# added by env:check --fix\n${lines.join("\n")}\n`);
    }
  }
  const stillMissing = missing.filter((key) => !appended.includes(key));
  // Empty in the example AND empty locally: a secret nobody has set yet.
  const unset = [...example.keys()].filter(
    (key) => local.has(key) && isEmpty(local.get(key)) && isEmpty(example.get(key)),
  );
  const isolation = databaseIsolationIssue(local);
  const notes = [];
  if (isolation) {
    notes.push(`${isolation}: Atlas outside production needs a *_dev database (docs/04 §11.1)`);
  }
  if (appended.length) notes.push(`added with defaults: ${appended.join(", ")}`);
  if (stillMissing.length) notes.push(`missing: ${stillMissing.join(", ")}`);
  if (unset.length) notes.push(`empty (may be optional): ${unset.join(", ")}`);
  const failed = stillMissing.length > 0 || isolation !== null;
  if (failed) problems += 1;
  process.stdout.write(
    `${failed ? "✗" : "✓"} ${label}${notes.length ? `: ${notes.join(" | ")}` : ""}\n`,
  );
}

if (envDoc === null) {
  process.stdout.write("\n! docs/06-bien-moi-truong.md not found\n");
} else if (undocumented.length > 0) {
  process.stdout.write(
    `\n! Not documented in docs/06-bien-moi-truong.md (add them in the same commit):\n  ${undocumented.join("\n  ")}\n`,
  );
}

if (problems > 0) {
  process.stdout.write(
    "\nSome variables need attention. Defaults: npm run env:check -- --fix. Secrets: see docs/06-bien-moi-truong.md.\n",
  );
  process.exitCode = 1;
}
