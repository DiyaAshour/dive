import dotenv from "dotenv";

dotenv.config({path: new URL("../../../.env", import.meta.url)});

function emailArgument(args: string[]): string | null {
  const inline = args.find((argument) => argument.startsWith("--email="));
  if (inline) return inline.slice("--email=".length).trim() || null;
  const index = args.indexOf("--email");
  return index >= 0 ? args[index + 1]?.trim() || null : null;
}

const email = emailArgument(process.argv.slice(2));
if (!email) {
  console.error("Usage: npm run admin:bootstrap -- --email you@example.com");
  process.exitCode = 1;
} else {
  const [{bootstrapFirstPlatformAdmin}, {database}] = await Promise.all([
    import("../src/admin/service"),
    import("@platform/database"),
  ]);
  try {
    const result = await bootstrapFirstPlatformAdmin(email);
    console.log(result.alreadyAdmin
      ? `[admin-bootstrap] ${result.email} is already the platform administrator.`
      : `[admin-bootstrap] ${result.email} is now the first platform administrator. Existing sessions were revoked; use /admin/login.`);
  } catch (error) {
    console.error(`[admin-bootstrap] ${error instanceof Error ? error.message : "Unable to bootstrap administrator"}`);
    process.exitCode = 1;
  } finally {
    await database().$disconnect();
  }
}
