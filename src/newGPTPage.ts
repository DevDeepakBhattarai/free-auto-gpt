import { Page } from "puppeteer";
import { observeTheMainMessageContainer } from "../lib/initializeApp";
import { sleep } from "../utils/sleep";
export async function newGPTPage(page: Page) {
  await page.click(
    "#__next > div.overflow-hidden.w-full.h-full.relative.flex.z-0 > div.dark.flex-shrink-0.overflow-x-hidden.bg-gray-900 > div > div > div > nav > div.mb-1.flex.flex-row.gap-2 > a"
  );
  await sleep(1000);
  await page.evaluate(observeTheMainMessageContainer);
}
