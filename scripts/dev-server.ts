import { spawn } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, type PathLike } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

type ProcessAlive = (pid: number) => boolean;

interface ChildExit {
  code: number | null;
  signal: NodeJS.Signals | null;
}

export function createForegroundEnvironment(
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const childEnvironment = { ...environment };

  // Astro 7 auto-detaches its dev server when am-i-vibing detects Codex.
  // Keep the server attached to this launcher so normal terminal teardown owns it.
  delete childEnvironment.CODEX_THREAD_ID;

  return childEnvironment;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function lockPid(lockFile: PathLike): number | null {
  if (!existsSync(lockFile)) return null;

  try {
    const value = JSON.parse(readFileSync(lockFile, "utf8")) as unknown;
    if (
      typeof value === "object" &&
      value !== null &&
      "pid" in value &&
      typeof value.pid === "number"
    ) {
      return value.pid;
    }
  } catch {
    // Astro ignores malformed lock files; leave them untouched for diagnosis.
  }

  return null;
}

export function removeOwnedDeadLock(
  lockFile: PathLike,
  childPid: number,
  processAlive: ProcessAlive = isProcessAlive,
): boolean {
  if (lockPid(lockFile) !== childPid || processAlive(childPid)) return false;

  try {
    unlinkSync(lockFile);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function signalExitCode(signal: NodeJS.Signals | null): number {
  if (signal === "SIGINT") return 130;
  if (signal === "SIGTERM") return 143;
  if (signal === "SIGHUP") return 129;
  return 1;
}

export async function runDevServer(
  args = process.argv.slice(2),
  rootDir = process.cwd(),
): Promise<number> {
  const require = createRequire(import.meta.url);
  const astroRoot = path.dirname(require.resolve("astro/package.json"));
  const astroBin = path.join(astroRoot, "bin/astro.mjs");
  const lockFile = path.join(rootDir, ".astro/dev.json");
  const child = spawn(process.execPath, [astroBin, "dev", ...args], {
    cwd: rootDir,
    env: createForegroundEnvironment(process.env),
    stdio: "inherit",
  });

  const childPid = child.pid;
  if (!childPid) throw new Error("Astro dev server failed to start.");

  const forwardedSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"];
  const handlers = forwardedSignals.map((signal) => {
    const handler = (): void => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill(signal);
      }
    };
    process.on(signal, handler);
    return [signal, handler] as const;
  });

  try {
    const result = await new Promise<ChildExit>((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code, signal }));
    });

    removeOwnedDeadLock(lockFile, childPid);
    return result.code ?? signalExitCode(result.signal);
  } finally {
    handlers.forEach(([signal, handler]) => {
      process.off(signal, handler);
    });
  }
}

const entryPoint = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (import.meta.url === entryPoint) {
  runDevServer()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
