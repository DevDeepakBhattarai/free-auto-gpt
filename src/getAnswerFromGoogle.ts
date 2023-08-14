import { Page } from "puppeteer";
import { sleep } from "../utils/sleep";
import { readFileSync } from "fs";
import { askGPT } from "./askGPT";
import { promptTemplate } from "../utils/promptTemplate";
import { summarize } from "./summarize";
import { parseLinks } from "../utils/parseLinks";
import { getMainContentFromTheWeb } from "./getMainContentFromWeb";

export async function getAnswerFormGoogle(page: Page, gptPage: Page) {
  const html = await getPageContentForInitialSearch(page);
  const templatePrompt = readFileSync("prompts/htmlPrompt.txt").toString();
  const replacements = {
    html: html,
  };
  const prompt = promptTemplate(templatePrompt, replacements);
  const answer = await askGPT(gptPage, prompt);
  console.log(answer);
  try {
    const response = JSON.parse(`${answer}`);
    const finalAnswer = await doNextStep(response, page, gptPage);
    return finalAnswer;
  } catch (e) {
    console.log("GPT did not give the answer in the correct format");
    return "";
  }

  async function doNextStep(
    response: { dataVed: string } | { answer: string },
    page: Page,
    gptPage: Page
  ) {
    if ("dataVed" in response) {
      await page.click(`[data-ved="${response.dataVed}"]`);
      await page.waitForNavigation();
      await sleep(2000);
      const summary = await getWebPageSummary(page, gptPage);
      return summary;
    }

    if ("answer" in response) {
      return response.answer;
    } else {
      console.log("Something went wrong cannot do");
      return "";
    }
  }
}

async function getPageContentForInitialSearch(page: Page) {
  const title = await page.evaluate(() => {
    return document.title;
  });

  const html = await page.evaluate(() => {
    return document.body.innerHTML;
  });

  return "QUESTION: " + title + "\n\n" + "HTML" + "\n" + parseLinks(html);
}

async function getWebPageSummary(page: Page, gptPage: Page) {
  const pageContent = await getMainContentFromTheWeb(page);
  return summarize(pageContent, gptPage);
}
