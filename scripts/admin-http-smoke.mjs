import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";

const port = "3218";
const origin = `http://127.0.0.1:${port}`;
const nextCli = fileURLToPath(import.meta.resolve("next/dist/bin/next"));
const child = spawn(process.execPath, [nextCli, "start"], {
  cwd: fileURLToPath(new URL("../apps/web", import.meta.url)),
  env: {...process.env, PORT: port},
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (chunk) => { output += chunk.toString(); });
child.stderr.on("data", (chunk) => { output += chunk.toString(); });

try {
  await waitForServer();

  const anonymous = await fetch(`${origin}/admin`, {redirect: "manual"});
  assert.ok(anonymous.status >= 300 && anonymous.status < 400);
  assert.match(anonymous.headers.get("location") ?? "", /^\/admin\/login/);

  const denied = await jsonPost("/api/v1/auth/admin-login", {email: "phase18-user@handmekey.invalid", password: "Phase18-User-Pass!"});
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get("set-cookie"), null);

  const adminLogin = await jsonPost("/api/v1/auth/admin-login", {email: "phase18-admin@handmekey.invalid", password: "Phase18-Admin-Pass!"});
  assert.equal(adminLogin.status, 200);
  const adminCookie = cookiePair(adminLogin.headers.get("set-cookie"), "hp_admin_session");

  const dashboard = await fetch(`${origin}/admin`, {headers: {cookie: adminCookie}});
  assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /Admin-scoped session/);

  const adminApi = await fetch(`${origin}/api/v1/admin/property-reviews`, {headers: {cookie: adminCookie}});
  assert.equal(adminApi.status, 200);

  const standardLogin = await jsonPost("/api/v1/auth/login", {email: "phase18-admin@handmekey.invalid", password: "Phase18-Admin-Pass!"});
  assert.equal(standardLogin.status, 200);
  const standardCookie = cookiePair(standardLogin.headers.get("set-cookie"), "hp_session");
  const scopeDenied = await fetch(`${origin}/api/v1/admin/property-reviews`, {headers: {cookie: standardCookie}});
  assert.equal(scopeDenied.status, 401, "standard session cookie must not authorize an admin endpoint");

  const logout = await fetch(`${origin}/api/v1/auth/admin-logout`, {method: "POST", headers: {cookie: adminCookie}});
  assert.equal(logout.status, 200);
  const afterLogout = await fetch(`${origin}/admin`, {redirect: "manual", headers: {cookie: adminCookie}});
  assert.ok(afterLogout.status >= 300 && afterLogout.status < 400);

  console.log("[admin-http-smoke] login, redirect, cookie scope, API guard and logout checks passed");
} catch (error) {
  console.error(output);
  throw error;
} finally {
  await stopServer();
}

async function stopServer() {
  if (child.exitCode !== null) return;

  child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    new Promise((resolve) => setTimeout(() => resolve(false), 5_000)),
  ]);

  if (!exited && child.exitCode === null) {
    child.kill("SIGKILL");
    await new Promise((resolve) => child.once("exit", resolve));
  }
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`web server exited early (${child.exitCode})`);
    try {
      const response = await fetch(`${origin}/admin/login`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error("web server did not become ready within 30 seconds");
}

function jsonPost(path, body) {
  return fetch(`${origin}${path}`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)});
}

function cookiePair(setCookie, expectedName) {
  assert.ok(setCookie, `expected ${expectedName} cookie`);
  const pair = setCookie.split(";", 1)[0];
  assert.ok(pair.startsWith(`${expectedName}=`), `expected ${expectedName}, received ${pair}`);
  return pair;
}
