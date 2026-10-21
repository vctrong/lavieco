// `npm run dev:up`: one command for a working local stack (docs/dev-local.md).
//   1. starts MongoDB + Mailpit (`npm run dev:infra`, waits until healthy);
//   2. frees the dev ports when a leftover `node` process holds them (and ONLY node:
//      anything else is reported and the script stops);
//   3. runs `npm run dev`.
// Development only. Prints process ids and names, never environment values.
//
//   npm run dev:up              all of the above
//   npm run dev:up -- --no-dev  steps 1–2 only
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { platform } from "node:os";

const isWindows = platform() === "win32";
const npm = isWindows ? "npm.cmd" : "npm";
const runDev = !process.argv.includes("--no-dev");

/** web, admin, identity, content, lead, program (CLAUDE §4). */
const DEV_PORTS = [3000, 3001, 4001, 4002, 4003, 4004];

function run(command, args) {
  return spawnSync(command, args, { stdio: "inherit", shell: isWindows }).status ?? 1;
}

/** Process ids listening on a TCP port of this machine. */
function listeners(port) {
  try {
    if (isWindows) {
      const out = execFileSync("netstat", ["-ano", "-p", "TCP"], { encoding: "utf8" });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        const cols = line.trim().split(/\s+/);
        // Proto  Local Address  Foreign Address  State  PID
        if (cols[0] === "TCP" && cols[3] === "LISTENING" && cols[1]?.endsWith(`:${port}`)) {
          pids.add(Number(cols[4]));
        }
      }
      return [...pids].filter((pid) => pid > 0);
    }
    const out = execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
      encoding: "utf8",
    });
    return out.split(/\s+/).filter(Boolean).map(Number);
  } catch {
    return []; // lsof exits 1 when nothing listens
  }
}

function processName(pid) {
  try {
    if (isWindows) {
      const out = execFileSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], {
        encoding: "utf8",
      });
      return (/^"([^"]+)"/.exec(out.trim())?.[1] ?? "").toLowerCase();
    }
    return execFileSync("ps", ["-p", String(pid), "-o", "comm="], { encoding: "utf8" })
      .trim()
      .split("/")
      .pop()
      .toLowerCase();
  } catch {
    return "";
  }
}

function kill(pid) {
  if (isWindows) {
    // /T: also the children (next dev spawns workers).
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    process.kill(pid, "SIGTERM");
  }
}

console.log("dev:up 1/3  MongoDB + Mailpit (docker compose)…");
if (run(npm, ["run", "dev:infra"]) !== 0) {
  console.error("dev:up: docker compose failed. Is Docker Desktop running? (docs/dev-local.md)");
  process.exit(1);
}

console.log("dev:up 2/3  checking dev ports…");
const blocked = [];
for (const port of DEV_PORTS) {
  for (const pid of listeners(port)) {
    const name = processName(pid);
    if (name === "node" || name === "node.exe") {
      try {
        kill(pid);
        console.log(`  port ${port}: stopped a leftover node process (pid ${pid})`);
      } catch {
        // Already gone (e.g. a child stopped with its parent's tree just before).
        if (processName(pid) === "") console.log(`  port ${port}: freed (pid ${pid} had exited)`);
        else blocked.push(`${port} (node pid ${pid}, could not be stopped)`);
      }
    } else {
      blocked.push(`${port} (${name || "unknown process"} pid ${pid})`);
    }
  }
}
if (blocked.length > 0) {
  console.error(
    `dev:up: ports still in use (non-node processes are never touched):\n  ${blocked.join("\n  ")}`,
  );
  console.error("Close those programs (or change their port), then run npm run dev:up again.");
  process.exit(1);
}
console.log("  ports free: " + DEV_PORTS.join(", "));

if (!runDev) process.exit(0);
console.log("dev:up 3/3  npm run dev (Ctrl+C to stop)…");
const child = spawn(npm, ["run", "dev"], { stdio: "inherit", shell: isWindows });
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
