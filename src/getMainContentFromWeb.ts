import { Page } from "puppeteer";

export async function getMainContentFromTheWeb(page: Page): Promise<string> {
  const pageContent = await page.evaluate(() => {
    const pageOrFileContent = document.querySelector("main")?.innerText;
    return pageOrFileContent;
  });
  if (!pageContent) {
    console.log("No page content");
    return "";
  }
  return pageContent;
}
