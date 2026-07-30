import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createForegroundEnvironment,
  removeOwnedDeadLock,
} from "./dev-server.ts";

let fixtureRoot = "";
let lockFile = "";

function writeLock(pid: number): void {
  mkdirSync(path.dirname(lockFile), { recursive: true });
  writeFileSync(lockFile, JSON.stringify({ pid }));
}

describe("dev server lifecycle", () => {
  beforeEach(() => {
    fixtureRoot = mkdtempSync(path.join(tmpdir(), "dev-server-"));
    lockFile = path.join(fixtureRoot, ".astro/dev.json");
  });

  afterEach(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it("removes Codex detection only from the child environment", () => {
    const environment = {
      CODEX_THREAD_ID: "thread-123",
      SITE_PASSWORD: "secret",
    };

    expect(createForegroundEnvironment(environment)).toEqual({
      SITE_PASSWORD: "secret",
    });
    expect(environment.CODEX_THREAD_ID).toBe("thread-123");
  });

  it("removes the owned lock after its child exits", () => {
    writeLock(123);

    expect(removeOwnedDeadLock(lockFile, 123, () => false)).toBe(true);
    expect(existsSync(lockFile)).toBe(false);
  });

  it("preserves the owned lock while its child is alive", () => {
    writeLock(123);

    expect(removeOwnedDeadLock(lockFile, 123, () => true)).toBe(false);
    expect(existsSync(lockFile)).toBe(true);
  });

  it("preserves a lock owned by another process", () => {
    writeLock(456);

    expect(removeOwnedDeadLock(lockFile, 123, () => false)).toBe(false);
    expect(existsSync(lockFile)).toBe(true);
  });
});
