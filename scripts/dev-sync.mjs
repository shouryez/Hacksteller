// Runs the dev server and keeps this folder in sync with GitHub.
// Every 20 s it fetches the current branch; when new commits arrive it fast-forwards,
// reinstalls packages if they changed, and restarts the server if config changed.
// Code changes are picked up by Next.js hot reload without a restart.
//
//   npm run dev:sync            (default port 3000)
//   npm run dev:sync -- 3001    (another port)
import { spawn, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS || 20_000);
const PORT = process.argv[2] || process.env.PORT || "3000";
const NEXT_BIN = path.join("node_modules", "next", "dist", "bin", "next");
const RESTART_FILES = [/^package(-lock)?\.json$/, /^next\.config\./, /^\.env/, /^tsconfig\.json$/, /^postcss\.config\./];

const log = (msg) => console.log(`\x1b[36m[sync ${new Date().toLocaleTimeString()}]\x1b[0m ${msg}`);
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

let server = null;
let restarting = false;

function startServer() {
  if (!existsSync(NEXT_BIN)) {
    log("Installing packages first…");
    execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["install"], { stdio: "inherit", shell: process.platform === "win32" });
  }
  server = spawn(process.execPath, [NEXT_BIN, "dev", "-p", PORT], { stdio: "inherit" });
  server.on("exit", (code) => {
    server = null;
    if (!restarting) {
      log(`Dev server stopped (code ${code}). Exiting.`);
      process.exit(code ?? 0);
    }
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.once("exit", () => resolve());
    if (process.platform === "win32") {
      try {
        execFileSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
      } catch {
        server.kill();
      }
    } else server.kill("SIGTERM");
  });
}

async function restartServer(reason) {
  restarting = true;
  log(`Restarting the app (${reason})…`);
  await stopServer();
  startServer();
  restarting = false;
}

let warnedLocal = false;

async function check() {
  let branch;
  try {
    branch = git("rev-parse", "--abbrev-ref", "HEAD");
    git("fetch", "--quiet", "origin", branch);
  } catch (e) {
    log(`Couldn't reach GitHub (${String(e.message).split("\n")[0]}). Will retry.`);
    return;
  }
  const behind = Number(git("rev-list", "--count", `HEAD..origin/${branch}`));
  if (!behind) return;

  const changed = git("diff", "--name-only", `HEAD..origin/${branch}`).split("\n").filter(Boolean);
  try {
    git("merge", "--ff-only", "--quiet", `origin/${branch}`);
    warnedLocal = false;
  } catch {
    if (!warnedLocal) {
      log("New changes are on GitHub, but files you edited locally block the update.");
      log("Run `git status` to see them; `git checkout -- <file>` discards your edit. Retrying every 20 s.");
      warnedLocal = true;
    }
    return;
  }
  const subject = git("log", "-1", "--format=%s");
  log(`Pulled ${behind} new change${behind > 1 ? "s" : ""}: "${subject}"`);
  log(`Files: ${changed.slice(0, 8).join(", ")}${changed.length > 8 ? ` +${changed.length - 8} more` : ""}`);

  if (changed.some((f) => /^package(-lock)?\.json$/.test(f))) {
    log("Packages changed → npm install");
    execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["install"], { stdio: "inherit", shell: process.platform === "win32" });
  }
  if (changed.some((f) => RESTART_FILES.some((re) => re.test(f)))) await restartServer("config or packages changed");
  else log("The page reloads by itself. If it doesn't, refresh the browser.");
}

process.on("SIGINT", async () => {
  restarting = true;
  await stopServer();
  process.exit(0);
});

log(`Auto-update is on: checking GitHub every ${INTERVAL_MS / 1000} s. Press Ctrl+C to stop.`);
startServer();
let busy = false;
setInterval(async () => {
  if (busy) return;
  busy = true;
  try {
    await check();
  } catch (e) {
    log(`Update check failed: ${e.message}`);
  } finally {
    busy = false;
  }
}, INTERVAL_MS);
