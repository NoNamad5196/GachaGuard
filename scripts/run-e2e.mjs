import { spawn, spawnSync } from "node:child_process";

const port = process.env.GACHAGUARD_E2E_PORT ?? "3100";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  GACHAGUARD_E2E_PORT: port,
  PLAYWRIGHT_BASE_URL: baseURL,
};

const server = spawn(process.execPath, ["./scripts/playwright-webserver.mjs"], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
  windowsHide: true,
});

let finished = false;

function stopServer() {
  if (server.killed) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    server.kill("SIGTERM");
  }
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseURL);
      if (response.ok || response.status < 500) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw lastError ?? new Error("Timed out waiting for the e2e dev server.");
}

try {
  await waitForServer();

  const cli = "./node_modules/@playwright/test/cli.js";
  const args = [cli, "test", ...process.argv.slice(2)];
  const tests = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: { ...env, GACHAGUARD_SKIP_WEBSERVER: "1" },
    stdio: "inherit",
    windowsHide: true,
  });

  const exitCode = await new Promise((resolve) => {
    tests.on("exit", (code) => resolve(code ?? 1));
  });

  finished = true;
  stopServer();
  process.exit(exitCode);
} catch (error) {
  console.error(error);
  finished = true;
  stopServer();
  process.exit(1);
}

process.on("SIGINT", () => {
  if (!finished) {
    stopServer();
  }
  process.exit(130);
});

process.on("SIGTERM", () => {
  if (!finished) {
    stopServer();
  }
  process.exit(143);
});
