import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const retryDelaysMs = [3_000, 7_000, 12_000, 20_000, 30_000];
const lockErrorPattern = /P1002|advisory lock|Timed out trying to acquire a postgres advisory lock/i;

// `prisma migrate status` is read-only and exits 0 when on-disk migrations and
// `_prisma_migrations` are already aligned. Avoid taking Prisma's production
// advisory lock on every content-only deployment when there is nothing to apply.
const status = spawnSync(npmCommand, ["run", "db:status"], {
  cwd: repoRoot,
  env: process.env,
  encoding: "utf8",
});
if (status.stdout) process.stdout.write(status.stdout);
if (status.stderr) process.stderr.write(status.stderr);
if (status.error) throw status.error;
if (status.status === 0) {
  console.log("[db:deploy] Migration status is current; skipping migrate deploy.");
  process.exit(0);
}

for (let attempt = 0; ; attempt += 1) {
  const result = spawnSync(npmCommand, ["run", "db:deploy"], {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.error) throw result.error;
  if (result.status === 0) process.exit(0);

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const delayMs = retryDelaysMs[attempt];
  if (!lockErrorPattern.test(output) || delayMs === undefined) {
    process.exit(result.status ?? 1);
  }

  console.warn(`[db:deploy] Prisma migration lock is busy. Retrying in ${Math.round(delayMs / 1000)}s (${attempt + 2}/${retryDelaysMs.length + 1})...`);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
