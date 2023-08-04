import { Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import recaptcha from "puppeteer-extra-plugin-recaptcha";
import stealth from "puppeteer-extra-plugin-stealth";
import { askGPT } from "./askGPT";
import { readFileSync } from "fs";
import { promptTemplate } from "../utils/promptTemplate";
import { sleep } from "../utils/sleep";
import { parseLinks } from "../utils/parseLinks";
import { openBrowser } from "../utils/openBrowser";
puppeteer.use(recaptcha()).use(stealth());

export async function recursiveAnswering(gptPage: Page, steps: string[]) {
  var page;
  for (const step of steps) {
    if (step === "Open browser") page = await openBrowser();
    if (step.startsWith("Search")) {
      var queryString = step.split("Search ")[1].slice(1, -1);
      if (page) {
        await page.goto("https://www.google.com");
        await page.type("#APjFqb", queryString);
        await page.keyboard.press("Enter");
        await sleep(2000);
        await linkReader(page, gptPage, queryString);
      }
    }
  }

  async function linkReader(page: Page, gptPage: Page, question: string) {
    const html = await getPageContent(page);
    const templatePrompt = readFileSync("prompts/htmlPrompt.txt").toString();
    const replacements = {
      html: html,
    };
    const prompt = promptTemplate(templatePrompt, replacements);
    console.log(prompt);
    const answer = await askGPT(gptPage, prompt);
    console.log(answer);
    try {
      const response = JSON.parse(`${answer}`);
      await doNextStep(response, page, gptPage, question);
    } catch (e) {
      console.log("GPT did not give the answer in the correct format");
    }
  }
}

async function getPageContent(page: Page) {
  const title = await page.evaluate(() => {
    return document.title;
  });

  const html = await page.evaluate(() => {
    return document.body.innerHTML;
  });

  return "QUESTION: " + title + "\n\n" + "HTML" + "\n" + parseLinks(html);
}

async function doNextStep(
  response: { dataVed: string } | { answer: string },
  page: Page,
  gptPage: Page,
  question: string
) {
  if ("dataVed" in response) {
    await page.click(`[data-ved="${response.dataVed}"]`);
  }

  if ("answer" in response) {
    const prompt = `For the given question: ${question}.
Generate the answer in a well formatted way(In natural language) from the given object
${JSON.stringify(response)}`;
    const answer = await askGPT(gptPage, prompt);
    console.log(answer);
  }
}
