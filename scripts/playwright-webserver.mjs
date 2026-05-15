import { spawn } from "node:child_process";

const port = process.env.GACHAGUARD_E2E_PORT ?? "3100";

const child = spawn(
  process.execPath,
  ["./node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", port],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  },
);

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (!child.killed) {
    child.kill(signal);
  }

  setTimeout(() => {
    if (!child.killed) {
      child.kill("SIGKILL");
    }
    process.exit(0);
  }, 1_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code, signal) => {
  if (shuttingDown) {
    process.exit(0);
  }

  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
