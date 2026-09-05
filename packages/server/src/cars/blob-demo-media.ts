import { listPublicCarVehiclePhotos as listStoredCarVehiclePhotos } from "./media";

const COROLLA_VEHICLE_ID = "toyota-corolla";
const COROLLA_BLOB_STORE_ID = "Yv9ln4LVsKxepm5O";
const COROLLA_BLOB_PREFIXES = [
  "Cars images /Toyota Corolla Sedan 2026/",
  "Cars images/Toyota Corolla Sedan 2026/",
  "Cars images /Toyota Corolla Sedan 2026",
  "Cars images/Toyota Corolla Sedan 2026",
] as const;
const BLOB_API_URL = "https://vercel.com/api/blob";
const BLOB_API_VERSION = "12";

type BlobListResponse = Readonly<{
  blobs?: ReadonlyArray<Readonly<{
    pathname: string;
    url: string;
    size?: number;
    uploadedAt?: string;
  }>>;
}>;

type BlobAuth = Readonly<{token: string; storeId: string}>;

type CorollaBlobPhoto = Readonly<{
  id: string;
  url: string;
  alt: string;
  category: string;
}>;

/**
 * Keeps the public demo Corolla gallery in sync with the images uploaded to
 * the HandMeKey Vercel Blob folder. The normal database/catalog media path is
 * preserved for every other vehicle and is also the fallback if Blob is not
 * available in a local/dev environment.
 */
export async function listPublicCarVehiclePhotosWithDemo(vehicleId: string) {
  if (vehicleId === COROLLA_VEHICLE_ID) {
    const blobPhotos = await listCorollaBlobPhotos().catch((error) => {
      console.error("[cars:media] Corolla Vercel Blob gallery lookup failed", error);
      return [] as CorollaBlobPhoto[];
    });
    if (blobPhotos.length > 0) return blobPhotos;
  }

  return listStoredCarVehiclePhotos(vehicleId);
}

async function listCorollaBlobPhotos(): Promise<CorollaBlobPhoto[]> {
  const authCandidates = blobAuthCandidates();
  if (authCandidates.length === 0) return [];

  for (const auth of authCandidates) {
    for (const prefix of COROLLA_BLOB_PREFIXES) {
      const blobs = await listBlobPrefix(auth, prefix).catch(() => []);
      const images = blobs.filter((blob) => isImagePath(blob.pathname));
      if (images.length === 0) continue;

      return images
        .map((blob, index) => {
          const category = inferCategory(blob.pathname);
          return {
            id: `catalog-vercel-corolla-${index}-${safeId(blob.pathname)}`,
            url: blob.url,
            alt: altForCategory(category),
            category,
          };
        })
        .sort((a, b) => categoryOrder(a.category) - categoryOrder(b.category) || a.id.localeCompare(b.id));
    }
  }

  return [];
}

async function listBlobPrefix(auth: BlobAuth, prefix: string) {
  const url = new URL(BLOB_API_URL);
  url.searchParams.set("limit", "50");
  url.searchParams.set("prefix", prefix);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${auth.token}`,
      "x-api-version": BLOB_API_VERSION,
      "x-vercel-blob-store-id": auth.storeId,
    },
    cache: "no-store",
  });

  if (!response.ok) return [];
  const body = await response.json() as BlobListResponse;
  return Array.isArray(body.blobs) ? body.blobs : [];
}

function blobAuthCandidates(): BlobAuth[] {
  const candidates: BlobAuth[] = [];
  const oidc = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (oidc) candidates.push({token: oidc, storeId: COROLLA_BLOB_STORE_ID});

  const readWrite = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (readWrite) {
    const storeId = readWrite.split("_")[3]?.trim();
    if (storeId) candidates.push({token: readWrite, storeId});
  }

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.storeId}:${candidate.token}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferCategory(pathname: string) {
  const name = normalizedName(pathname);
  const front = hasAny(name, ["front", "أمام", "امام"]);
  const rear = hasAny(name, ["rear", "back", "خلف"]);
  const left = hasAny(name, ["left", "يسار"]);
  const right = hasAny(name, ["right", "يمين"]);

  if (hasAny(name, ["280", "hero", "main", "cover", "three quarter", "three-quarter", "3 4", "3-4"])) return "HERO";
  if (front && left) return "EXTERIOR_FRONT_LEFT";
  if (front && right) return "EXTERIOR_FRONT_RIGHT";
  if (rear && left) return "EXTERIOR_REAR_LEFT";
  if (rear && right) return "EXTERIOR_REAR_RIGHT";
  if (front) return "EXTERIOR_FRONT";
  if (rear) return "EXTERIOR_REAR";
  if (left) return "EXTERIOR_LEFT";
  if (right) return "EXTERIOR_RIGHT";
  return "OTHER";
}

function normalizedName(pathname: string) {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Vercel already returns decoded pathnames in normal operation.
  }
  return decoded.toLowerCase().replace(/[_.]+/g, " ").replace(/\s+/g, " ");
}

function hasAny(value: string, needles: readonly string[]) {
  return needles.some((needle) => value.includes(needle));
}

function isImagePath(pathname: string) {
  return /\.(?:jpe?g|png|webp|avif)$/i.test(pathname);
}

function safeId(pathname: string) {
  return pathname.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(-60) || "image";
}

function categoryOrder(category: string) {
  const order: Record<string, number> = {
    HERO: 0,
    EXTERIOR_FRONT: 10,
    EXTERIOR_FRONT_LEFT: 11,
    EXTERIOR_FRONT_RIGHT: 12,
    EXTERIOR_REAR: 20,
    EXTERIOR_REAR_LEFT: 21,
    EXTERIOR_REAR_RIGHT: 22,
    EXTERIOR_LEFT: 30,
    EXTERIOR_RIGHT: 40,
    OTHER: 90,
  };
  return order[category] ?? 99;
}

function altForCategory(category: string) {
  const labels: Record<string, string> = {
    HERO: "Toyota Corolla Sedan 2026 studio view",
    EXTERIOR_FRONT: "Toyota Corolla Sedan 2026 front view",
    EXTERIOR_FRONT_LEFT: "Toyota Corolla Sedan 2026 front left view",
    EXTERIOR_FRONT_RIGHT: "Toyota Corolla Sedan 2026 front right view",
    EXTERIOR_REAR: "Toyota Corolla Sedan 2026 rear view",
    EXTERIOR_REAR_LEFT: "Toyota Corolla Sedan 2026 rear left view",
    EXTERIOR_REAR_RIGHT: "Toyota Corolla Sedan 2026 rear right view",
    EXTERIOR_LEFT: "Toyota Corolla Sedan 2026 left side view",
    EXTERIOR_RIGHT: "Toyota Corolla Sedan 2026 right side view",
  };
  return labels[category] ?? "Toyota Corolla Sedan 2026";
}
