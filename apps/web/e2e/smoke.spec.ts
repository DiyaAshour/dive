import { expect, test } from "@playwright/test";

test("production health endpoints are reachable", async ({request}) => {
  const live = await request.get("/api/v1/health/live");
  expect(live.ok()).toBeTruthy();
  const ready = await request.get("/api/v1/health/ready");
  expect(ready.ok()).toBeTruthy();
  const body = await ready.json() as {ready?: boolean; database?: {ready?: boolean}};
  expect(body.ready).toBe(true);
  expect(body.database?.ready).toBe(true);
});

test("traveler can move from marketplace search to a canonical hotel slug", async ({page}) => {
  await page.goto("/");
  await expect(page.locator("body")).toContainText("HandMeKey");
  await page.goto("/search?destination=Amman");
  await expect(page.locator("h1").first()).toContainText("Amman");
  const hotelLink = page.locator('a[href^="/hotel/"]').first();
  await expect(hotelLink).toBeVisible();
  const href = await hotelLink.getAttribute("href");
  expect(href).toMatch(/^\/hotel\/demo-/);
  await page.goto(href!);
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/hotel\/demo-/);
  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structuredData.some((value) => value.includes('"@type":"Hotel"'))).toBeTruthy();
  await expect(page.locator("body")).toContainText(/final|price|rate|السعر|الإجمالي/i);
});

test("bare hotel path routes travelers to marketplace search", async ({page}) => {
  await page.goto("/hotel");
  await expect(page).toHaveURL(/\/search/);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("China guest market automatically selects Chinese and CNY while preserving source charge currency", async ({browser}) => {
  const context = await browser.newContext({locale:"zh-CN",extraHTTPHeaders:{"x-vercel-ip-country":"CN"}});
  const page = await context.newPage();
  try {
    await page.goto("/search?destination=Amman");
    await expect(page.locator("body")).toContainText("实时可订");
    await page.getByRole("button",{name:"语言和货币"}).click();
    await expect(page.locator('select[aria-label="货币"]')).toHaveValue("CNY");
    await expect(page.locator(".premiumResultPrice").first()).toContainText(/¥|CN¥/);
    await expect(page.locator(".premiumResultPrice").first()).toContainText(/JOD|预订将按酒店原始币种计费/);
  } finally {
    await context.close();
  }
});

test("explicit traveler language and currency override automatic country detection", async ({page}) => {
  await page.context().setExtraHTTPHeaders({"x-vercel-ip-country":"CN","accept-language":"zh-CN,zh;q=0.9"});
  await page.goto("/");
  await page.evaluate(async () => {
    await fetch("/api/v1/preferences/locale",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({locale:"en"})});
    await fetch("/api/v1/preferences/currency",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({currency:"USD"})});
  });
  await page.reload();
  await page.getByRole("button",{name:"Language & currency"}).click();
  await expect(page.locator('select[aria-label="Language"]')).toHaveValue("en");
  await expect(page.locator('select[aria-label="Currency"]')).toHaveValue("USD");
  await expect(page.locator("body")).toContainText("Find the stay you want");
});

test("Arabic destination aliases resolve through Search 2", async ({page}) => {
  await page.goto(`/search?destination=${encodeURIComponent("العقبة")}`);
  await expect(page.locator("h1").first()).toContainText("Aqaba");
  await expect(page.locator('a[href^="/hotel/demo-"]').first()).toBeVisible();
});

test("destination autocomplete returns bilingual matches", async ({request}) => {
  const response = await request.get(`/api/v1/discovery/suggestions?q=${encodeURIComponent("العق")}&locale=ar`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as {data?: Array<{label?: string;searchValue?: string}>};
  expect(body.data?.some((item)=>item.label?.includes("العقبة") || item.searchValue?.includes("العقبة"))).toBeTruthy();
});

test("destination landing is indexable and links canonical hotel slugs", async ({page}) => {
  await page.goto("/hotels/jordan/aqaba");
  await expect(page.locator("h1")).toContainText(/Aqaba|العقبة/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/hotels\/jordan\/aqaba$/);
  await expect(page.locator('a[href^="/hotel/demo-"]').first()).toBeVisible();
  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structuredData.some((value) => value.includes('"@type":"CollectionPage"'))).toBeTruthy();
});

test("sitemap publishes destination and hotel commerce URLs", async ({request}) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBeTruthy();
  const xml = await response.text();
  expect(xml).toContain("/hotels/jordan/aqaba");
  expect(xml).toMatch(/\/hotel\/demo-/);
});

test("Google Hotel List and landing feeds are generated automatically", async ({request}) => {
  const hotelList = await request.get("/api/v1/integrations/google-hotels/hotel-list.xml");
  expect(hotelList.ok()).toBeTruthy();
  expect(hotelList.headers()["content-type"]).toContain("application/xml");
  const hotelXml = await hotelList.text();
  expect(hotelXml).toContain("<listings");
  expect(hotelXml).toContain("<country>JO</country>");
  const hotelId = hotelXml.match(/<id>([^<]+)<\/id>/)?.[1];
  expect(hotelId).toBeTruthy();

  const landingPages = await request.get("/api/v1/integrations/google-hotels/landing-pages.xml");
  expect(landingPages.ok()).toBeTruthy();
  const landingXml = await landingPages.text();
  expect(landingXml).toContain("<PointsOfSale>");
  expect(landingXml).toContain("(PARTNER-HOTEL-ID)");
  expect(landingXml).toContain("/google/hotel");

  const deepLink = await request.get(`/google/hotel?hotel_id=${encodeURIComponent(hotelId!)}&checkin=2026-09-10&checkout=2026-09-12&adults=2&children=1`, {maxRedirects: 0});
  expect(deepLink.status()).toBe(302);
  const location = deepLink.headers()["location"] ?? "";
  expect(location).toMatch(/\/hotel\/demo-/);
  expect(location).toContain("arrival=2026-09-10");
  expect(location).toContain("departure=2026-09-12");
  expect(location).toContain("utm_source=google");
});

test("account recovery surface is available", async ({page}) => {
  await page.goto("/forgot-password");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
});

test("search result pages are noindex but public content remains followable", async ({page}) => {
  await page.goto("/search?destination=Aqaba");
  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveAttribute("content", /noindex/i);
});

test("email operations requires an administrator session", async ({page}) => {
  await page.goto("/admin/communications/email");
  await expect(page).toHaveURL(/\/admin\/login\?next=/);
});

test("Google distribution console requires an administrator session", async ({page}) => {
  await page.goto("/admin/distribution/google-hotels");
  await expect(page).toHaveURL(/\/admin\/login\?next=/);
});
