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

test("traveler can move from marketplace search to a live hotel", async ({page}) => {
  await page.goto("/");
  await expect(page.locator("body")).toContainText("HandMeKey");
  await page.goto("/search?destination=Amman");
  await expect(page.locator("h1").first()).toContainText("Amman");
  const hotelLink = page.locator('a[href^="/hotel/"]').first();
  await expect(hotelLink).toBeVisible();
  const href = await hotelLink.getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.locator("body")).toContainText(/final|price|rate|السعر|الإجمالي/i);
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
