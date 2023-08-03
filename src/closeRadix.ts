import { Page } from "puppeteer";
import { sleep } from "../utils/sleep";

export async function closeRadixModal(page: Page) {
  // ! Radix modal opens every time we start so we need to close those
  try {
    await page.waitForSelector("button.btn.relative.btn-neutral.ml-auto");
    await sleep(500);
    await page.click("button.btn.relative.btn-neutral.ml-auto");
    await sleep(500);
    await page.waitForSelector("button.btn.relative.btn-neutral.ml-auto");
    await sleep(500);
    await page.click("button.btn.relative.btn-neutral.ml-auto");
    await sleep(500);
    await page.waitForSelector("button.btn.relative.btn-primary.ml-auto");
    await sleep(500);
    await page.click("button.btn.relative.btn-primary.ml-auto");
    await sleep(500);
  } catch (e) {
    console.log("Radix popup not found");
  }
}
