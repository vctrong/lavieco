// Compares every `.env.local` with its `.env.example` (root and each workspace project)
// and reports, by NAME only, the variables that are missing or still empty. Values are
// never printed. Exit code 1 when something needs attention, so it can gate scripts.
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

const isEmpty = (value) => value === undefined || value === "" || value === "''" || value === '""';

let problems = 0;
for (const dir of projectDirs) {
  const examplePath = join(root, dir, ".env.example");
  if (!existsSync(examplePath)) continue;
  const localPath = join(root, dir, ".env.local");
  const label = dir === "." ? "(root)" : dir.replaceAll("\\", "/");
  if (!existsSync(localPath)) {
    process.stdout.write(`✗ ${label}: no .env.local (run npm run env:init)\n`);
    problems += 1;
    continue;
  }
  const example = parse(examplePath);
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
  const notes = [];
  if (appended.length) notes.push(`added with defaults: ${appended.join(", ")}`);
  if (stillMissing.length) notes.push(`missing: ${stillMissing.join(", ")}`);
  if (unset.length) notes.push(`empty (may be optional): ${unset.join(", ")}`);
  if (stillMissing.length) problems += 1;
  process.stdout.write(
    `${stillMissing.length ? "✗" : "✓"} ${label}${notes.length ? `: ${notes.join(" | ")}` : ""}\n`,
  );
}

if (problems > 0) {
  process.stdout.write(
    "\nSome variables are missing. Defaults: npm run env:check -- --fix. Secrets: see docs/runbooks/chay-local.md §2.\n",
  );
  process.exitCode = 1;
}
