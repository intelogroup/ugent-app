import { chromium } from "playwright";

const URL = "http://localhost:3000/strategy";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(4000);

// Switch to Explorer
await page.locator('button:has-text("Explorer")').click();
await page.waitForTimeout(3000);

// Click Respiratory
const pulmoBtn = page.locator('text=Respiratory').first();
await pulmoBtn.click();
await page.waitForTimeout(2000);
await page.screenshot({ path: "/tmp/strategy-level2.png", fullPage: true });
console.log("Level 2 screenshot: /tmp/strategy-level2.png");

// See what topic type circles appear
const bodyText = await page.evaluate(() => document.body.innerText);
const pulmoSection = bodyText.split("Respiratory")[1]?.slice(0, 400) || "N/A";
console.log(`\nAfter clicking Respiratory:${pulmoSection}`);

// Find the surrounding circles
const circles = page.locator('button.rounded-full.w-20');
const circleCount = await circles.count();
console.log(`\nTopic type circles: ${circleCount}`);
for (let i = 0; i < circleCount; i++) {
  const text = await circles.nth(i).textContent();
  console.log(`  Circle ${i}: "${text?.trim()}"`);
}

// Click the first topic type circle
if (circleCount > 0) {
  await circles.first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/tmp/strategy-level3.png", fullPage: true });
  console.log("\nLevel 3 screenshot: /tmp/strategy-level3.png");

  // Check for disease list
  const diseaseButtons = page.locator('button:has(svg), button:has(span.text-sm.font-bold)');
  console.log(`Disease items near: ${await diseaseButtons.count()}`);
  for (let i = 0; i < Math.min(await diseaseButtons.count(), 10); i++) {
    const t = await diseaseButtons.nth(i).textContent();
    console.log(`  Disease ${i}: "${t?.trim()}"`);
  }
}

// Check console errors
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
await page.waitForTimeout(500);
if (errors.length > 0) console.log("Console errors:", errors.slice(0, 3));
else console.log("No console errors");

await browser.close();
