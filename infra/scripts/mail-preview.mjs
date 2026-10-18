// Renders every email (identity: OTP, account exists, password changed, mail test;
// program: ticket email cases, mail test) from made-up data into .mail-preview/ and
// serves an index at http://localhost:3999 to review them in a browser. Sends nothing
// and reads no .env.local.
//
//   npm run mail:preview              render + serve
//   npm run mail:preview -- --no-serve render only
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

const OUT = resolve(".mail-preview");
const PORT = 3999;
const SERVICES = ["identity-service", "program-service"];

// One command string: every part is a constant.
const run = (command) => spawnSync(command, { stdio: "inherit", shell: true }).status;

// Templates import the built shared packages.
if (
  run(
    "npx turbo run build --filter=@lavieco/shared --filter=@lavieco/service-kit --output-logs=errors-only",
  ) !== 0
) {
  process.exit(1);
}
rmSync(OUT, { recursive: true, force: true });
for (const service of SERVICES) {
  if (
    run(`npm run mail:preview --silent -w @lavieco/${service} -- "${join(OUT, service)}"`) !== 0
  ) {
    process.exit(1);
  }
}

const escape = (value) => value.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);
const sections = SERVICES.map((service) => {
  const names = readdirSync(join(OUT, service))
    .filter((file) => file.endsWith(".html"))
    .map((file) => file.slice(0, -5));
  const rows = names
    .map((name) => {
      const subject = readFileSync(join(OUT, service, `${name}.txt`), "utf8").split("\n")[0];
      return `<li><a href="${service}/${name}.html">${escape(name)}</a> · <a href="${service}/${name}.txt">text</a><br><small>${escape(subject)}</small></li>`;
    })
    .join("");
  return `<h2>${service}</h2><ul>${rows}</ul>`;
}).join("");
writeFileSync(
  join(OUT, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>LAVIECO mail preview</title><body style="font:15px/1.6 Arial,sans-serif;max-width:720px;margin:32px auto;padding:0 16px"><h1>LAVIECO mail preview</h1><p>Dữ liệu giả. Ảnh cid đã được nhúng để xem trong trình duyệt.</p>${sections}</body>`,
);

if (process.argv.includes("--no-serve")) {
  process.stdout.write(`Rendered into ${OUT}\n`);
} else {
  const types = { ".html": "text/html; charset=utf-8", ".txt": "text/plain; charset=utf-8" };
  createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    const file = resolve(OUT, `.${path === "/" ? "/index.html" : path}`);
    if (!file.startsWith(OUT) || !existsSync(file)) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  }).listen(PORT, "127.0.0.1", () => {
    process.stdout.write(`Mail preview: http://localhost:${PORT} (Ctrl+C to stop)\n`);
  });
}
