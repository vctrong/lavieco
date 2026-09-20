// Creates `.env.local` from `.env.example` for the root and every workspace project.
// Never overwrites an existing `.env.local`, and never prints values.
import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const projectDirs = [".", ...["apps", "services", "packages"].flatMap(listChildren)];

function listChildren(group) {
  const dir = join(root, group);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(group, entry.name));
}

let created = 0;
for (const dir of projectDirs) {
  const example = join(root, dir, ".env.example");
  const target = join(root, dir, ".env.local");
  if (!existsSync(example) || existsSync(target)) continue;
  copyFileSync(example, target);
  created += 1;
  process.stdout.write(`created ${join(dir, ".env.local")}\n`);
}
process.stdout.write(`env:init done (${created} file(s) created)\n`);
