import { hotelRoleCan, type HotelPermission, type HotelRole } from "@platform/core";
import { database } from "@platform/database";
import { forbidden, unauthorized } from "../errors";

export async function requireHotelPermission(userId: string | null | undefined, hotelId: string, permission: HotelPermission) {
  if (!userId) unauthorized();
  const user = await database().user.findUnique({
    where: {id: userId},
    select: {hotelMemberships: {where: {hotelId, status: "ACTIVE"}, select: {role: true}, take: 1}},
  });
  if (!user) unauthorized();
  const membership = user.hotelMemberships[0];
  if (!membership || !hotelRoleCan(membership.role as HotelRole, permission)) forbidden();
  return {hotelRole: membership.role};
}
