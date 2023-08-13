import { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer-extra";

export async function openBrowser(): Promise<[Page, Browser]> {
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-UK,en",
  });
  await page.goto("https://www.google.com");
  return [page, browser];
}
