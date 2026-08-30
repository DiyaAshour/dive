import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const retryDelaysMs = [3_000, 7_000, 12_000, 20_000, 30_000];
const lockErrorPattern = /P1002|advisory lock|Timed out trying to acquire a postgres advisory lock/i;

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
