import dotenv from "dotenv";

dotenv.config({path: new URL("../../../.env", import.meta.url)});

type Args = Readonly<{email: string; password: string; name: string}>;

function argumentValue(args: string[], name: string): string | null {
  const inline = args.find((argument) => argument.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3).trim() || null;
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1]?.trim() || null : null;
}

function parseArgs(argv: string[]): Args {
  const email = argumentValue(argv, "email")?.toLowerCase() ?? "";
  const password = argumentValue(argv, "password") ?? "";
  const name = argumentValue(argv, "name") ?? "HandMeKey Admin";
  if (!email || !email.includes("@") || email.length > 254) throw new Error("A valid --email is required");
  if (password.length < 12 || password.length > 128) throw new Error("--password must be between 12 and 128 characters");
  if (name.length < 2 || name.length > 120) throw new Error("--name must be between 2 and 120 characters");
  return {email, password, name};
}

function assertLocalDatabase() {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) throw new Error("DATABASE_URL is missing. Create .env from .env.example first.");
  const url = new URL(raw);
  const allowed = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);
  if (!allowed.has(url.hostname)) {
    throw new Error(`Refusing to provision an administrator against non-local database host '${url.hostname}'.`);
  }
}

const input = parseArgs(process.argv.slice(2));
assertLocalDatabase();

const [{database}, {hashPassword}] = await Promise.all([
  import("@platform/database"),
  import("../src/auth/password"),
]);

try {
  const passwordHash = await hashPassword(input.password);
  const result = await database().$transaction(async (tx) => {
    const existing = await tx.user.findUnique({where: {email: input.email}, select: {id: true, platformRole: true}});
    const user = existing
      ? await tx.user.update({
          where: {id: existing.id},
          data: {
            displayName: input.name,
            platformRole: "PLATFORM_ADMIN",
            credential: {upsert: {create: {passwordHash}, update: {passwordHash}}},
          },
          select: {id: true, email: true, displayName: true, platformRole: true},
        })
      : await tx.user.create({
          data: {
            email: input.email,
            displayName: input.name,
            platformRole: "PLATFORM_ADMIN",
            credential: {create: {passwordHash}},
          },
          select: {id: true, email: true, displayName: true, platformRole: true},
        });

    await tx.session.deleteMany({where: {userId: user.id}});
    await tx.auditLog.create({data: {
      actorUserId: user.id,
      action: "LOCAL_ADMIN_PROVISIONED",
      entityType: "User",
      entityId: user.id,
      before: existing ? {platformRole: existing.platformRole} : undefined,
      after: {platformRole: "PLATFORM_ADMIN", method: "local-development-provisioner"},
    }});
    return user;
  }, {isolationLevel: "Serializable"});

  console.log(`[local-admin] ready: ${result.email} (${result.displayName})`);
  console.log("[local-admin] existing sessions were revoked; sign in at http://localhost:3000/admin/login");
} catch (error) {
  console.error(`[local-admin] ${error instanceof Error ? error.message : "Unable to provision local administrator"}`);
  process.exitCode = 1;
} finally {
  await database().$disconnect();
}
