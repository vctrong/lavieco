// Sends one test email through the SMTP settings of each sending service (OTP from
// identity-service, tickets from program-service), so a real provider can be checked
// before anyone books. Each service reads its own .env.local; nothing is printed but
// the server and, on failure, what to fix (docs/06-bien-moi-truong.md, "Gửi email thật").
// `--provider` picks the route (ADR-0023): `auto` = Brevo then Gmail, as the services do.
//
//   npm run mail:test -- <email>                            both services
//   npm run mail:test -- <email> --service program-service  one service
//   npm run mail:test -- <email> --provider=brevo           one route (brevo|gmail|auto)
import { spawnSync } from "node:child_process";

const SERVICES = ["identity-service", "program-service"];
const args = process.argv.slice(2);
const serviceIndex = args.indexOf("--service");
const only = serviceIndex >= 0 ? args[serviceIndex + 1] : undefined;
const to = args.find(
  (arg, index) => !arg.startsWith("--") && (serviceIndex < 0 || index !== serviceIndex + 1),
);
const PROVIDERS = ["auto", "brevo", "gmail"];
const provider = args.find((arg) => arg.startsWith("--provider="))?.split("=")[1] ?? "auto";

// The address goes through a shell on Windows: only plain address characters pass.
const plainAddress = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
if (
  !to ||
  !plainAddress.test(to) ||
  (only !== undefined && !SERVICES.includes(only)) ||
  !PROVIDERS.includes(provider)
) {
  process.stderr.write(
    `Usage: npm run mail:test -- <email> [--service ${SERVICES.join("|")}] ` +
      `[--provider=${PROVIDERS.join("|")}]\n`,
  );
  process.exit(2);
}

// One command string: every part is a constant, or the address/provider checked above.
const npm = (params) =>
  spawnSync(`npm ${params.join(" ")}`, { stdio: "inherit", shell: true }).status;

let failed = 0;
for (const service of only ? [only] : SERVICES) {
  const workspace = `@lavieco/${service}`;
  // `build` is plain tsc: it leaves the running dev server (swc from src) alone.
  if (npm(["run", "build", "--silent", "-w", workspace]) !== 0) {
    process.stderr.write(`[${service}] build failed, mail test skipped\n`);
    failed += 1;
    continue;
  }
  const test = [
    "run",
    "mail:test",
    "--silent",
    "-w",
    workspace,
    "--",
    to,
    `--provider=${provider}`,
  ];
  if (npm(test) !== 0) failed += 1;
}
process.exitCode = failed > 0 ? 1 : 0;
