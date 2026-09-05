const BLOB_API_URL = "https://vercel.com/api/blob";
const BLOB_API_VERSION = "12";
const FALLBACK_STORE_ID = "Yv9ln4LVsKxepm5O";
const PREFIXES = ["Cars images /", "Cars images/"] as const;

type BlobRow = Readonly<{pathname:string;url:string;size?:number;uploadedAt?:string}>;
type BlobListResponse = Readonly<{blobs?:ReadonlyArray<BlobRow>;cursor?:string}>;
type BlobAuth = Readonly<{token:string;storeId:string}>;

const auth = blobAuthCandidates()[0];
if (!auth) {
  console.log("[car-blob-scan] no Blob auth available");
  process.exit(0);
}

const byPath = new Map<string, BlobRow>();
for (const prefix of PREFIXES) {
  let cursor: string | undefined;
  do {
    const url = new URL(BLOB_API_URL);
    url.searchParams.set("limit", "1000");
    url.searchParams.set("prefix", prefix);
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${auth.token}`,
        "x-api-version": BLOB_API_VERSION,
        "x-vercel-blob-store-id": auth.storeId,
      },
      cache: "no-store",
    });
    if (!response.ok) {
      console.log(`[car-blob-scan] prefix=${JSON.stringify(prefix)} status=${response.status}`);
      break;
    }
    const body = await response.json() as BlobListResponse;
    for (const blob of body.blobs ?? []) byPath.set(blob.pathname, blob);
    cursor = body.cursor || undefined;
  } while (cursor);
}

const blobs = [...byPath.values()].sort((a,b)=>a.pathname.localeCompare(b.pathname));
const vehicleFolders = [...new Set(blobs.map((blob)=>carFolder(blob.pathname)).filter((value): value is string => Boolean(value) && /^2026-\d{2}-\d{2}_/.test(value)))].sort();
console.log(`[car-blob-scan] store=${auth.storeId} blobs=${blobs.length} vehicleFolders=${vehicleFolders.length}`);
console.log(`[car-blob-scan] vehicleFolders=${JSON.stringify(vehicleFolders)}`);

for (const blob of blobs.filter((item)=>/(?:^|\/)(?:catalog-index\.json|vehicle_specs\.json|car-info\.json)$/i.test(item.pathname))) {
  const response = await fetch(blob.url, {cache:"no-store"});
  const text = response.ok ? await response.text() : `HTTP ${response.status}`;
  console.log(`[car-blob-scan] json=${JSON.stringify(blob.pathname)} content=${text.slice(0,12000)}`);
}

function carFolder(pathname:string) {
  const normalized = pathname.replace(/^Cars images\s*\//i, "");
  const [folder] = normalized.split("/");
  return folder?.trim() || null;
}

function blobAuthCandidates(): BlobAuth[] {
  const candidates: BlobAuth[] = [];
  const oidc = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (oidc) candidates.push({token:oidc, storeId:FALLBACK_STORE_ID});
  const readWrite = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (readWrite) {
    const storeId = readWrite.split("_")[3]?.trim();
    if (storeId) candidates.unshift({token:readWrite, storeId});
  }
  const seen = new Set<string>();
  return candidates.filter((candidate)=>{
    const key = `${candidate.storeId}:${candidate.token}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
