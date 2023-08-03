import { Page } from "puppeteer";
import { sleep } from "../utils/sleep";

export async function askGPT(page: Page, prompt: string) {
  const clipboard = (await import("clipboardy")).default;
  await clipboard.write(prompt);
  await page.focus("textarea");
  await page.keyboard.down("ControlLeft");
  await page.keyboard.press("v");
  await page.keyboard.up("ControlLeft");
  await sleep(100);
  await page.waitForSelector(
    "#__next > div > div > div > main > div > form > div > div > button"
  );

  await page.click(
    "#__next > div > div > div > main > div > form > div > div > button"
  );

  const finalAnswer = await new Promise<string>((resolve) => {
    page.on("console", (value) => {
      resolve(value.text());
    });
  });

  return finalAnswer!;
}
