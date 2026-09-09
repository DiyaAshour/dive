type BlogCoverSource = Readonly<{
  coverImageUrl?: string | null;
  title: string;
  slug: string;
  category?: string | null;
  tags?: readonly string[];
}>;

type CuratedCover = Readonly<{
  url: string;
  keywords: readonly string[];
}>;

// Curated, stable Unsplash image URLs. The source photos are free to use under
// the Unsplash License. Explicit CMS cover images always take priority.
const CURATED_COVERS: readonly CuratedCover[] = [
  {
    url: "https://images.unsplash.com/photo-1627902011272-7ada906bc4ec?auto=format&fit=crop&w=1600&q=82",
    keywords: ["wadi rum", "desert", "road trip", "adventure", "صحراء", "وادي رم", "رحلة برية"],
  },
  {
    url: "https://images.unsplash.com/photo-1761014586555-947a9555d302?auto=format&fit=crop&w=1600&q=82",
    keywords: ["key", "keys", "deposit", "insurance", "payment", "credit card", "contract", "booking", "مفتاح", "تأمين", "تأمين السيارة", "تأمين سيارات", "عربون", "وديعة", "دفع", "عقد", "حجز"],
  },
  {
    url: "https://images.unsplash.com/photo-1661789165886-9af8842bb073?auto=format&fit=crop&w=1600&q=82",
    keywords: ["amman", "airport", "queen alia", "city", "downtown", "عمّان", "عمان", "المطار", "مطار الملكة علياء", "المدينة"],
  },
  {
    url: "https://images.unsplash.com/photo-1560546941-be7b4ac3b40e?auto=format&fit=crop&w=1600&q=82",
    keywords: ["drive", "driving", "road", "highway", "car", "rental car", "car rental", "hire car", "قيادة", "طريق", "سيارة", "تأجير سيارات", "استئجار سيارة"],
  },
  {
    url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=82",
    keywords: ["hotel", "stay", "resort", "room", "accommodation", "فندق", "إقامة", "منتجع", "غرفة"],
  },
  {
    url: "https://images.unsplash.com/photo-1768451673681-7e793a7f4900?auto=format&fit=crop&w=1800&q=88",
    keywords: ["jordan", "travel", "destination", "guide", "الأردن", "الاردن", "سفر", "وجهة", "دليل"],
  },
] as const;

const FALLBACK_POOL = CURATED_COVERS.map((cover) => cover.url);

export function resolveBlogCoverImage(post: BlogCoverSource): string {
  const explicit = post.coverImageUrl?.trim();
  if (explicit) return explicit;

  const haystack = [post.title, post.category ?? "", ...(post.tags ?? [])]
    .join(" ")
    .toLocaleLowerCase();

  const matched = CURATED_COVERS.find((cover) =>
    cover.keywords.some((keyword) => haystack.includes(keyword.toLocaleLowerCase())),
  );
  if (matched) return matched.url;

  return FALLBACK_POOL[stableIndex(post.slug, FALLBACK_POOL.length)]!;
}

function stableIndex(value: string, modulo: number): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return modulo > 0 ? hash % modulo : 0;
}
