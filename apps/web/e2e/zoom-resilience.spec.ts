import {expect,test,type Page} from "@playwright/test";

async function expectNoDocumentOverflow(page:Page,label:string){
  const size=await page.evaluate(()=>({viewport:window.innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  expect(size.doc,`${label}: document overflow`).toBeLessThanOrEqual(size.viewport+1);
  expect(size.body,`${label}: body overflow`).toBeLessThanOrEqual(size.viewport+1);
}

async function setArabic(page:Page){
  await page.goto("/");
  await page.evaluate(async()=>{
    await fetch("/api/v1/preferences/locale",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({locale:"ar"})});
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir","rtl");
}

test("desktop navigation collapses before browser zoom can make labels collide",async({page})=>{
  for(const width of [1180,1100,1000,900,820]){
    await page.setViewportSize({width,height:800});
    await setArabic(page);
    await expect(page.locator(".siteNav")).toBeHidden();
    await expect(page.locator(".mobileSiteNav")).toBeVisible();
    await expectNoDocumentOverflow(page,`Arabic compact header ${width}px`);
  }
});

test("home hero reflows cleanly at zoom-equivalent tablet widths",async({page})=>{
  for(const width of [1040,980,900,820]){
    await page.setViewportSize({width,height:800});
    await page.goto("/");
    await expect(page.locator(".premiumHeroCopy h1")).toBeVisible();
    await expect(page.locator(".heroVisual")).toBeHidden();
    const heading=await page.locator(".premiumHeroCopy h1").evaluate((node)=>({fontSize:parseFloat(getComputedStyle(node).fontSize),width:node.getBoundingClientRect().width}));
    expect(heading.fontSize).toBeLessThanOrEqual(58.5);
    expect(heading.width).toBeLessThanOrEqual(width);
    await expectNoDocumentOverflow(page,`home hero ${width}px`);
  }
});
