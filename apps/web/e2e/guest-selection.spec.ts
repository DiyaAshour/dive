import { expect, test, type Page } from "@playwright/test";

async function setEnglish(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    await fetch("/api/v1/preferences/locale", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({locale:"en"}),
    });
  });
  await page.reload();
}

test("home guest selector is preserved through results and hotel availability", async ({page}) => {
  await setEnglish(page);

  await page.locator(".homeSearchGuests").click();
  await page.getByRole("button",{name:"Increase Children"}).click();
  await page.getByRole("button",{name:"Increase Infants"}).click();
  await page.getByRole("button",{name:"Increase Pets"}).click();

  await page.locator(".homeSearchDock button[type=submit]").click();
  await expect(page).toHaveURL(/\/search\?/);
  const searchUrl=new URL(page.url());
  expect(searchUrl.searchParams.get("adults")).toBe("2");
  expect(searchUrl.searchParams.get("children")).toBe("1");
  expect(searchUrl.searchParams.get("infants")).toBe("1");
  expect(searchUrl.searchParams.get("pets")).toBe("1");

  await expect(page.locator(".searchGuestPickerCell")).toBeVisible();
  await expect(page.locator("body")).toContainText("1 infant");
  await expect(page.locator("body")).toContainText("1 pet");

  const hotelLink=page.locator('a[href^="/hotel/"]').first();
  await expect(hotelLink).toBeVisible();
  const href=await hotelLink.getAttribute("href");
  expect(href).toContain("children=1");
  expect(href).toContain("infants=1");
  expect(href).toContain("pets=1");
  await hotelLink.click();

  await expect(page.locator(".hotelGuestPickerCell")).toBeVisible();
  const hotelUrl=new URL(page.url());
  expect(hotelUrl.searchParams.get("children")).toBe("1");
  expect(hotelUrl.searchParams.get("infants")).toBe("1");
  expect(hotelUrl.searchParams.get("pets")).toBe("1");
  await expect(page.locator("body")).toContainText("1 infant");
  await expect(page.locator("body")).toContainText("1 pet");
});
