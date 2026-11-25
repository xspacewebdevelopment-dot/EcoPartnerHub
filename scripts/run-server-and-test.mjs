import { spawn } from "child_process";
import http from "http";

const PORT = 3005;
process.env.BASE_URL = `http://127.0.0.1:${PORT}`;

function waitForServer(port, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}/api/health/db`, (res) => {
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("Server startup timed out"));
        } else {
          setTimeout(check, 500);
        }
      });
    };
    check();
  });
}

async function main() {
  console.log(`Starting Next.js production server on port ${PORT}...`);
  const server = spawn("node", ["./node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
    stdio: "inherit",
    shell: true,
  });

  const cleanup = () => {
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(server.pid), "/f", "/t"]);
      } else {
        server.kill("SIGTERM");
      }
    } catch {}
  };

  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    await waitForServer(PORT);
    console.log(`Server is ready on port ${PORT}. Running test suite...\n`);

    const testSuite = spawn("node", ["./scripts/test-auth-apis.mjs"], {
      stdio: "inherit",
      env: { ...process.env, BASE_URL: `http://127.0.0.1:${PORT}` },
    });

    testSuite.on("exit", (code) => {
      cleanup();
      process.exit(code || 0);
    });
  } catch (err) {
    console.error("Error during server run & test:", err);
    cleanup();
    process.exit(1);
  }
}

main();
