import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document, `document width ${dimensions.document} exceeds viewport ${dimensions.viewport}`).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.body, `body width ${dimensions.body} exceeds viewport ${dimensions.viewport}`).toBeLessThanOrEqual(dimensions.viewport + 1);
}

test.describe("mobile-first traveler flow", () => {
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

  test("home commerce surface and search stay inside the phone viewport", async ({page}) => {
    await page.goto("/");
    await expect(page.locator(".mobileSiteNav > summary")).toBeVisible();
    await expect(page.locator(".homeSearchDock")).toBeVisible();
    await expect(page.locator(".homeSearchWhere")).toBeVisible();

    const checkIn = await page.locator(".homeSearchCheckIn").boundingBox();
    const checkOut = await page.locator(".homeSearchCheckOut").boundingBox();
    expect(checkIn).not.toBeNull();
    expect(checkOut).not.toBeNull();
    expect(Math.abs(checkIn!.y-checkOut!.y)).toBeLessThanOrEqual(2);
    expect(checkIn!.width).toBeGreaterThan(120);
    expect(checkOut!.width).toBeGreaterThan(120);

    const stayGrid = page.locator(".stayCardGrid");
    await expect(stayGrid).toBeVisible();
    const gridStyle = await stayGrid.evaluate((element) => {
      const style = getComputedStyle(element);
      return {display:style.display,overflowX:style.overflowX,scrollSnapType:style.scrollSnapType};
    });
    expect(gridStyle.display).toBe("flex");
    expect(["auto","scroll"]).toContain(gridStyle.overflowX);
    expect(gridStyle.scrollSnapType).toContain("x");
    await expect(page.locator(".stayCard").first()).toBeVisible();
    await expect(page.locator(".stayCardCtaCopy").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/search?destination=Amman");
    await expect(page.locator(".mobileSearchCommand")).toBeVisible();
    await expect(page.locator(".searchSummaryBar")).toBeHidden();
    await expect(page.locator(".searchFilters")).toBeHidden();
    await expect(page.locator(".premiumResultCard").first()).toBeVisible();
    await expect(page.locator(".resultCta").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.locator(".mobileSearchFilterButton").click();
    await expect(page.locator(".mobileSearchSheet")).toBeVisible();
    await expect(page.locator(".mobileSearchFilterForm")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.locator(".mobileSearchSheetHeader button").click();
    await expect(page.locator(".mobileSearchSheet")).toBeHidden();

    await page.locator(".mobileSearchCommandMain").click();
    await expect(page.locator(".mobileSearchEditForm")).toBeVisible();
    await expect(page.locator('.mobileSearchEditForm input[name="destination"]')).toHaveValue("Amman");
    await page.locator(".mobileSearchSheetHeader button").click();
  });

  test("hotel room selection, gallery and checkout are phone-safe", async ({page}) => {
    await page.goto("/search?destination=Amman");
    const hotelLink = page.locator('a[href^="/hotel/demo-"]').first();
    await expect(hotelLink).toBeVisible();
    const hotelHref = await hotelLink.getAttribute("href");
    expect(hotelHref).toBeTruthy();

    await hotelLink.click();
    await expect(page).toHaveURL(new RegExp(`/hotel/demo-`));
    await expect(page.locator(".premiumGallery img").first()).toBeVisible();
    await expect(page.locator(".hotelBookingRail")).toBeVisible();
    await expect(page.locator(".publicRoomMedia").first()).toBeVisible();
    await expect(page.locator(".hotelMobileQuickNav")).toBeVisible();
    await expect(page.locator(".mobileRoomCommerceSummary").first()).toBeVisible();

    const bookingWorkspace = await page.locator(".hotelBookingWorkspace").boundingBox();
    const trustLayer = await page.locator(".hotelTrustLayer").boundingBox();
    expect(bookingWorkspace).not.toBeNull();
    expect(trustLayer).not.toBeNull();
    expect(bookingWorkspace!.y).toBeLessThan(trustLayer!.y);

    const firstRoom = page.locator(".roomOfferCard").first();
    const rateToggle = firstRoom.locator(".mobileRoomRateToggle");
    if (await rateToggle.count()) {
      const secondaryRate = firstRoom.locator(".mobileSecondaryRate").first();
      await expect(rateToggle).toBeVisible();
      await expect(secondaryRate).toBeHidden();
      await rateToggle.click();
      await expect(rateToggle).toHaveAttribute("aria-expanded", "true");
      await expect(secondaryRate).toBeVisible();
      await rateToggle.click();
      await expect(secondaryRate).toBeHidden();
    }
    await expectNoHorizontalOverflow(page);

    await page.locator(".premiumGallery img").first().click();
    await expect(page.locator(".hotelGalleryLightbox")).toBeVisible();
    const imageFit = await page.locator(".hotelGalleryMain img").evaluate((image) => getComputedStyle(image).objectFit);
    expect(imageFit).toBe("contain");
    const stage = await page.locator(".hotelGalleryStage").boundingBox();
    const image = await page.locator(".hotelGalleryMain img").boundingBox();
    expect(stage).not.toBeNull();
    expect(image).not.toBeNull();
    expect(image!.width).toBeLessThanOrEqual(stage!.width + 1);
    expect(image!.height).toBeLessThanOrEqual(stage!.height + 1);
    await expectNoHorizontalOverflow(page);
    await page.locator(".hotelGalleryTopbar button").click();

    const checkoutLink = page.locator(".bookRateButton").first();
    await expect(checkoutLink).toBeVisible();
    const checkoutHref = await checkoutLink.getAttribute("href");
    expect(checkoutHref).toMatch(/^\/checkout\?/);
    await page.goto(checkoutHref!);
    await expect(page.locator(".checkout")).toBeVisible();
    await expect(page.locator(".walletReserveButton")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
