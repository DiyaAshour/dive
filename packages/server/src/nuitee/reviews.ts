type RawRecord = Record<string, unknown>;

const API_BASE = "https://api.liteapi.travel/v3.0";
const REVIEW_TIMEOUT_MS = 8_000;

export type NuiteePublicReview = Readonly<{
  id: string;
  overall: number;
  cleanliness: number | null;
  staff: number | null;
  location: number | null;
  facilities: number | null;
  comfort: number | null;
  value: number | null;
  title: string | null;
  comment: string;
  hotelReply: string | null;
  guestName: string;
  stayCompleted: string;
  source: "NUITEE";
}>;

export type NuiteePublicReviewData = Readonly<{
  summary: Readonly<{
    count: number;
    overall: number | null;
    cleanliness: number | null;
    staff: number | null;
    location: number | null;
    facilities: number | null;
    comfort: number | null;
    value: number | null;
  }>;
  reviews: readonly NuiteePublicReview[];
}>;

export async function getNuiteeHotelReviews(hotelId: string, limit = 60): Promise<NuiteePublicReviewData> {
  const clean = hotelId.trim().replace(/^nuitee-/i, "");
  if (!/^[A-Za-z0-9_-]+$/.test(clean)) return emptyReviews();
  const apiKey = process.env.NUITEE_API_KEY?.trim();
  if (!apiKey) return emptyReviews();

  const params = new URLSearchParams({
    hotelId: clean,
    limit: String(Math.max(1, Math.min(1000, limit))),
    timeout: "4",
  });

  try {
    const response = await fetch(`${API_BASE}/data/reviews?${params.toString()}`, {
      method: "GET",
      headers: {accept: "application/json", "X-API-Key": apiKey},
      cache: "no-store",
      signal: AbortSignal.timeout(REVIEW_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error("Nuitee review request failed", {hotelId: clean, status: response.status});
      return emptyReviews();
    }
    const payload = await response.json() as unknown;
    const rows = records(record(payload).data);
    const reviews = rows.flatMap((row, index) => normalizeReview(row, clean, index));
    const scores = reviews.map((review) => review.overall).filter(Number.isFinite);
    const overall = scores.length ? round1(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
    return {
      summary: {
        count: reviews.length,
        overall,
        // Nuitee's documented hotel-review response currently exposes averageScore
        // per review, but not a verified category breakdown. Keep category scores
        // null instead of inventing cleanliness/location/etc. values.
        cleanliness: null,
        staff: null,
        location: null,
        facilities: null,
        comfort: null,
        value: null,
      },
      reviews,
    };
  } catch (error) {
    console.error("Nuitee reviews unavailable", error);
    return emptyReviews();
  }
}

function normalizeReview(row: RawRecord, hotelId: string, index: number): NuiteePublicReview[] {
  const score = numberValue(row.averageScore) ?? numberValue(row.score) ?? numberValue(row.rating);
  if (score === null) return [];
  const overall = Math.max(0, Math.min(10, score));
  const title = text(row.headline) ?? text(row.title);
  const pros = text(row.pros);
  const cons = text(row.cons);
  const fallbackComment = title ?? "Guest rating";
  const comment = [pros, cons].filter(Boolean).join(" — ") || fallbackComment;
  const guestName = text(row.name) ?? text(row.guestName) ?? "Guest";
  const date = text(row.date) ?? text(row.reviewDate) ?? "";
  const identity = [hotelId, guestName, date, title ?? "", overall, index].join(":");
  return [{
    id: `nuitee:${hash(identity)}`,
    overall: round1(overall),
    cleanliness: null,
    staff: null,
    location: null,
    facilities: null,
    comfort: null,
    value: null,
    title,
    comment,
    hotelReply: null,
    guestName,
    stayCompleted: date,
    source: "NUITEE",
  }];
}

function emptyReviews(): NuiteePublicReviewData {
  return {
    summary: {count: 0, overall: null, cleanliness: null, staff: null, location: null, facilities: null, comfort: null, value: null},
    reviews: [],
  };
}

function record(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RawRecord : {};
}
function records(value: unknown): RawRecord[] {
  return Array.isArray(value) ? value.map(record).filter((item) => Object.keys(item).length > 0) : [];
}
function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function numberValue(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}
