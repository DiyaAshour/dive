import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const audit = spawnSync(npmCommand, ["audit", "--omit=dev", "--json"], {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

if (audit.error) {
  console.error("Unable to run npm audit:", audit.error.message);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout || "{}");
} catch {
  console.error("npm audit did not return valid JSON");
  console.error(audit.stdout);
  console.error(audit.stderr);
  process.exit(1);
}

const exceptions = new Map([
  [
    "GHSA-GGR8-5VV4-36MX",
    {
      package: "deepmerge-ts",
      expires: "2026-09-15",
      reason: "Upstream Prisma CLI/config dependency; application runtime does not call Prisma config merging with request data.",
    },
  ],
]);

const vulnerabilities = report.vulnerabilities ?? {};
const blocking = [];
const accepted = [];

for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (!isHighOrCritical(vulnerability.severity)) continue;
  const advisories = rootAdvisories(name, vulnerabilities, new Set());
  if (advisories.length === 0) {
    blocking.push({name, reason: "No root advisory could be resolved"});
    continue;
  }

  const unresolved = advisories.filter((advisory) => !isAcceptedException(advisory));
  if (unresolved.length > 0) {
    blocking.push({name, advisories: unresolved});
  } else {
    accepted.push({name, advisories});
  }
}

for (const item of accepted) {
  const ids = [...new Set(item.advisories.map((advisory) => advisory.id))].join(", ");
  console.warn(`[security-audit] accepted time-bounded upstream exception for ${item.name}: ${ids}`);
}

if (blocking.length > 0) {
  console.error("[security-audit] blocking high/critical production dependency findings:");
  console.error(JSON.stringify(blocking, null, 2));
  process.exit(1);
}

console.log("[security-audit] no unapproved high/critical production dependency vulnerabilities found");

function rootAdvisories(name, graph, seen) {
  if (seen.has(name)) return [];
  seen.add(name);
  const vulnerability = graph[name];
  if (!vulnerability) return [];
  const roots = [];
  for (const via of vulnerability.via ?? []) {
    if (typeof via === "string") {
      roots.push(...rootAdvisories(via, graph, new Set(seen)));
      continue;
    }
    roots.push({
      package: name,
      id: advisoryId(via.url),
      url: via.url ?? null,
      severity: via.severity ?? vulnerability.severity,
    });
  }
  return dedupe(roots);
}

function isAcceptedException(advisory) {
  if (!advisory.id) return false;
  const exception = exceptions.get(advisory.id);
  if (!exception || advisory.package !== exception.package) return false;
  const expiry = new Date(`${exception.expires}T23:59:59.999Z`);
  if (Number.isNaN(expiry.getTime()) || Date.now() > expiry.getTime()) {
    console.error(`[security-audit] exception ${advisory.id} expired on ${exception.expires}`);
    return false;
  }
  return true;
}

function advisoryId(url) {
  if (typeof url !== "string") return null;
  const match = url.match(/GHSA-[A-Za-z0-9-]+/i);
  return match ? match[0].toUpperCase() : null;
}

function isHighOrCritical(severity) {
  return severity === "high" || severity === "critical";
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.package}:${item.id}:${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
