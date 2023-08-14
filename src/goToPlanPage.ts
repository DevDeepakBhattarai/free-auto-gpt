import { Page } from "puppeteer";
import { sidebarSelector } from "./sidebarSelector";
import { observeTheMainMessageContainer } from "../lib/initializeApp";

export async function goToPlanPage(index: number, gptPage: Page) {
  try {
    await gptPage.click(sidebarSelector(index));
  } catch (e) {
    console.log(e);
    console.log("Cannot click on the sidebar");
  }
  await gptPage.evaluate(observeTheMainMessageContainer);
}
