import { Page } from "puppeteer";
import { readFileSync } from "fs";
export async function setCookies(page: Page): Promise<boolean> {
  let localCookies;
  try {
    const localCookiesString = readFileSync("cookies.json").toString();
    localCookies = JSON.parse(localCookiesString);
    await page.setCookie(...localCookies);
  } catch (e) {
    console.log("No cookies were found");
  }
  return Boolean(localCookies);
}
