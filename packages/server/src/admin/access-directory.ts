import {database} from "@platform/database";
import {requirePlatformAdmin} from "./authorization";

export type IdentityDirectoryRole = "ALL" | "GUEST" | "HOTEL_USER" | "PLATFORM_ADMIN";
export type IdentityDirectoryStatus = "ALL" | "ACTIVE" | "LOCKED";
export type IdentityDirectorySort = "NEWEST" | "OLDEST" | "NAME";

export type IdentityDirectoryInput = Readonly<{
  query?: string;
  role?: IdentityDirectoryRole;
  status?: IdentityDirectoryStatus;
  hotelId?: string;
  page?: number;
  pageSize?: number;
  sort?: IdentityDirectorySort;
}>;

function configuredOwner() {
  return {
    id: process.env.PLATFORM_OWNER_USER_ID?.trim() || null,
    email: process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase() || null,
  };
}

async function resolveOwner() {
  const configured = configuredOwner();
  if (configured.id || configured.email) {
    return database().user.findFirst({
      where: {
        platformRole: "PLATFORM_ADMIN",
        ...(configured.id ? {id: configured.id} : {}),
        ...(configured.email ? {email: configured.email} : {}),
      },
      select: {id: true, email: true, displayName: true, createdAt: true},
    });
  }
  return database().user.findFirst({
    where: {platformRole: "PLATFORM_ADMIN"},
    orderBy: [{createdAt: "asc"}, {id: "asc"}],
    select: {id: true, email: true, displayName: true, createdAt: true},
  });
}

export async function getIdentityDirectory(actorUserId: string, input: IdentityDirectoryInput = {}) {
  const actor = await requirePlatformAdmin(actorUserId);
  const owner = await resolveOwner();
  const query = input.query?.trim().slice(0, 120) ?? "";
  const role = input.role ?? "ALL";
  const status = input.status ?? "ALL";
  const hotelId = input.hotelId?.trim() ?? "";
  const pageSize = Math.max(10, Math.min(Math.floor(input.pageSize ?? 50), 100));
  const requestedPage = Math.max(1, Math.floor(input.page ?? 1));
  const sort = input.sort ?? "NEWEST";
  const now = new Date();

  const where = {
    AND: [
      ...(query ? [{OR: [
        {email: {contains: query, mode: "insensitive" as const}},
        {displayName: {contains: query, mode: "insensitive" as const}},
      ]}] : []),
      ...(role !== "ALL" ? [{platformRole: role}] : []),
      ...(status === "ACTIVE" ? [{credential: {isNot: null}}] : []),
      ...(status === "LOCKED" ? [{credential: {is: null}}] : []),
      ...(hotelId ? [{hotelMemberships: {some: {hotelId}}}] : []),
    ],
  };

  const [filteredTotal, total, administrators, hotelUsers, guests, locked, hotels] = await Promise.all([
    database().user.count({where}),
    database().user.count(),
    database().user.count({where: {platformRole: "PLATFORM_ADMIN"}}),
    database().user.count({where: {platformRole: "HOTEL_USER"}}),
    database().user.count({where: {platformRole: "GUEST"}}),
    database().user.count({where: {credential: {is: null}}}),
    database().hotel.findMany({
      select: {id: true, name: true, slug: true, city: true, status: true},
      orderBy: [{name: "asc"}, {city: "asc"}],
      take: 1000,
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const orderBy = sort === "NAME"
    ? [{displayName: "asc" as const}, {email: "asc" as const}]
    : sort === "OLDEST"
      ? [{createdAt: "asc" as const}, {id: "asc" as const}]
      : [{createdAt: "desc" as const}, {id: "desc" as const}];

  const rows = await database().user.findMany({
    where,
    select: {
      id: true,
      email: true,
      displayName: true,
      platformRole: true,
      createdAt: true,
      credential: {select: {userId: true}},
      sessions: {
        where: {expiresAt: {gt: now}},
        select: {scope: true, lastUsedAt: true},
        orderBy: {lastUsedAt: "desc"},
      },
      hotelMemberships: {
        select: {
          id: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          hotel: {select: {id: true, name: true, slug: true, city: true, status: true}},
        },
        orderBy: {createdAt: "asc"},
      },
    },
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    actor: {id: actor.id, isOwner: owner?.id === actor.id},
    owner,
    counts: {total, administrators, hotelUsers, guests, locked},
    filteredTotal,
    pagination: {page, pageSize, pageCount},
    filters: {query, role, status, hotelId, sort},
    hotels,
    users: rows.map(({credential, sessions, ...user}) => ({
      ...user,
      isOwner: owner?.id === user.id,
      accessState: credential ? "ACTIVE" as const : "LOCKED" as const,
      activeStandardSessions: sessions.filter((session) => session.scope === "STANDARD").length,
      activeAdminSessions: sessions.filter((session) => session.scope === "ADMIN").length,
      lastActivity: sessions[0]?.lastUsedAt ?? null,
    })),
  };
}
