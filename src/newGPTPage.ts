import { Page } from "puppeteer";
import { observeTheMainMessageContainer } from "./initializeApp";
import { sleep } from "../utils/sleep";
export async function newGPTPage(page: Page) {
  await page.click(
    "#__next > div.overflow-hidden.w-full.h-full.relative.flex.z-0 > div > div > div > button.px-3"
  );
  await sleep(1000);
  await page.evaluate(observeTheMainMessageContainer);
}
