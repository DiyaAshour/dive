import { expect, test, type Page } from "@playwright/test";

type Viewport = {name:string;width:number;height:number};

const commerceViewports: Viewport[] = [
  {name:"fold-narrow",width:320,height:568},
  {name:"small-phone",width:360,height:800},
  {name:"phone",width:390,height:844},
  {name:"large-phone",width:430,height:932},
  {name:"tablet-portrait",width:768,height:1024},
  {name:"tablet-landscape",width:1024,height:768},
  {name:"laptop",width:1366,height:768},
  {name:"desktop-hd",width:1920,height:1080},
];

async function expectViewportSafe(page: Page, label: string) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document, `${label}: document ${dimensions.document}px > viewport ${dimensions.viewport}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.body, `${label}: body ${dimensions.body}px > viewport ${dimensions.viewport}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function firstHotelHref(page: Page) {
  const link = page.locator('a[href^="/hotel/demo-"]').first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  return href!;
}

async function setLocale(page: Page, locale: "ar"|"en"|"zh") {
  await page.goto("/");
  await page.evaluate(async (nextLocale) => {
    await fetch("/api/v1/preferences/locale", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({locale:nextLocale}),
    });
  }, locale);
  await page.reload();
}

test("core marketplace is viewport-safe from 320px phones through HD desktop", async ({page}) => {
  for (const viewport of commerceViewports) {
    await page.setViewportSize({width:viewport.width,height:viewport.height});

    await page.goto("/");
    await expect(page.locator("body")).toContainText("HandMeKey");
    await expectViewportSafe(page, `${viewport.name} home`);

    await page.goto("/search?destination=Amman");
    await expect(page.locator(".premiumResultCard").first()).toBeVisible();
    await expectViewportSafe(page, `${viewport.name} search`);

    const href = await firstHotelHref(page);
    await page.goto(href);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator(".publicRoomProduct").first()).toBeVisible();
    await expectViewportSafe(page, `${viewport.name} hotel`);
  }
});

test("secondary public surfaces are safe on phone, tablet and desktop", async ({page}) => {
  const viewports: Viewport[] = [
    {name:"phone",width:360,height:800},
    {name:"tablet",width:768,height:1024},
    {name:"desktop",width:1366,height:768},
  ];
  const routes = [
    "/rewards/en",
    "/blog/en",
    "/partner",
    "/partner/login",
    "/login",
    "/forgot-password",
    "/admin/login",
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      await expectViewportSafe(page, `${viewport.name} ${route}`);
    }
  }
});

test("Arabic RTL marketplace remains viewport-safe", async ({page}) => {
  for (const viewport of [{width:360,height:800},{width:768,height:1024}]) {
    await page.setViewportSize(viewport);
    await setLocale(page,"ar");
    await expect(page.locator("html")).toHaveAttribute("dir","rtl");
    await expectViewportSafe(page, `rtl home ${viewport.width}`);

    await page.goto(`/search?destination=${encodeURIComponent("العقبة")}`);
    await expect(page.locator("h1").first()).toBeVisible();
    await expectViewportSafe(page, `rtl search ${viewport.width}`);
  }
});

test("Chinese mobile content and the global market switcher fit narrow screens", async ({page}) => {
  await page.setViewportSize({width:320,height:700});
  await setLocale(page,"zh");
  await expect(page.locator("html")).toHaveAttribute("dir","ltr");
  await expectViewportSafe(page,"zh home 320");

  await page.getByRole("button",{name:"语言和货币"}).click();
  await expect(page.locator('select[aria-label="货币"]')).toBeAttached();
  await expectViewportSafe(page,"zh market switcher 320");

  await page.goto("/search?destination=Amman");
  await expect(page.locator(".premiumResultCard").first()).toBeVisible();
  await expectViewportSafe(page,"zh search 320");
});

test("phone landscape keeps hotel gallery and booking controls inside the viewport", async ({page}) => {
  await page.setViewportSize({width:844,height:390});
  await page.goto("/search?destination=Amman");
  const href = await firstHotelHref(page);
  await page.goto(href);
  await expectViewportSafe(page,"landscape hotel");

  await page.locator(".premiumGallery img").first().click();
  await expect(page.locator(".hotelGalleryLightbox")).toBeVisible();
  await expectViewportSafe(page,"landscape gallery");
  const fit = await page.locator(".hotelGalleryMain img").evaluate((node) => getComputedStyle(node).objectFit);
  expect(fit).toBe("contain");
});
