import { database } from "@platform/database";
import { forbidden, unauthorized } from "../errors";

export async function requirePlatformAdmin(userId: string | null | undefined) {
  if (!userId) unauthorized();
  const user = await database().user.findUnique({where: {id: userId}, select: {id: true, platformRole: true}});
  if (!user) unauthorized();
  if (user.platformRole !== "PLATFORM_ADMIN") forbidden("Platform administrator access is required");
  return user;
}
