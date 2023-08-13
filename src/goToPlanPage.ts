import { Page } from "puppeteer";
import { sidebarSelector } from "./sidebarSelector";
import { observeTheMainMessageContainer } from "./initializeApp";

export async function goToPlanPage(index: number, gptPage: Page) {
  await gptPage.click(sidebarSelector(index));
  await gptPage.evaluate(observeTheMainMessageContainer);
}
