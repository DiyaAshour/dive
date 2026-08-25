export function siteUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://handmekey.com").replace(/\/+$/, "");
  if (!path) return base;
  return `${base}/${path.replace(/^\/+/, "")}`;
}
