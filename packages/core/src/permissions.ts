export const PLATFORM_ROLES = ["GUEST", "HOTEL_USER", "PLATFORM_ADMIN"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const HOTEL_ROLES = ["OWNER", "MANAGER", "REVENUE", "FRONT_DESK", "FINANCE", "VIEWER"] as const;
export type HotelRole = (typeof HOTEL_ROLES)[number];

export const HOTEL_PERMISSIONS = [
  "hotel:view",
  "hotel:edit",
  "rooms:manage",
  "rates:manage",
  "inventory:manage",
  "bookings:view",
  "bookings:manage",
  "finance:view",
  "finance:manage",
  "members:manage",
] as const;
export type HotelPermission = (typeof HOTEL_PERMISSIONS)[number];

const permissionsByRole: Readonly<Record<HotelRole, ReadonlySet<HotelPermission>>> = {
  OWNER: new Set(HOTEL_PERMISSIONS),
  MANAGER: new Set(["hotel:view", "hotel:edit", "rooms:manage", "rates:manage", "inventory:manage", "bookings:view", "bookings:manage", "finance:view", "finance:manage", "members:manage"]),
  REVENUE: new Set(["hotel:view", "rooms:manage", "rates:manage", "inventory:manage", "bookings:view", "finance:view"]),
  FRONT_DESK: new Set(["hotel:view", "bookings:view", "bookings:manage"]),
  FINANCE: new Set(["hotel:view", "bookings:view", "finance:view", "finance:manage"]),
  VIEWER: new Set(["hotel:view", "bookings:view"]),
};

export function hotelRoleCan(role: HotelRole, permission: HotelPermission): boolean {
  return permissionsByRole[role].has(permission);
}
