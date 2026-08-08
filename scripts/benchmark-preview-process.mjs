import { spawn } from "node:child_process";
import process from "node:process";

const STOP_TIMEOUT_MS = 5_000;

export function startBenchmarkPreview(packageName) {
  return spawn("pnpm", ["--filter", packageName, "preview"], {
    detached: process.platform !== "win32",
    env: process.env,
    stdio: ["ignore", "ignore", "inherit"],
  });
}

export async function stopBenchmarkPreview(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;

  await new Promise((resolvePromise) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(forceTimer);
      resolvePromise();
    };
    const forceTimer = setTimeout(() => {
      signalProcessTree(child, "SIGKILL");
      finish();
    }, STOP_TIMEOUT_MS);

    forceTimer.unref();
    child.once("exit", finish);
    signalProcessTree(child, "SIGTERM");
  });
}

function signalProcessTree(child, signal) {
  try {
    if (process.platform !== "win32" && child.pid !== undefined) {
      process.kill(-child.pid, signal);
    } else {
      child.kill(signal);
    }
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}
