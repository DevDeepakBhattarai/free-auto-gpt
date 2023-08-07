import { Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import recaptcha from "puppeteer-extra-plugin-recaptcha";
import stealth from "puppeteer-extra-plugin-stealth";
import { askGPT } from "./askGPT";
import { readFileSync, writeFileSync, appendFileSync } from "fs";
import { promptTemplate } from "../utils/promptTemplate";
import { sleep } from "../utils/sleep";
import { parseLinks } from "../utils/parseLinks";
import { openBrowser } from "../utils/openBrowser";
import { splitText } from "../utils/splitText";
import PdfParse from "pdf-parse";
import { newGPTPage } from "./newGPTPage";
import { execSync } from "child_process";
const CHUNK_SIZE = 16000;

puppeteer.use(recaptcha()).use(stealth());

interface Response {
  [key: string]: string;
}

export async function recursiveAnswering(
  gptPage: Page,
  steps: string[],
  userTask: string
) {
  await newGPTPage(gptPage);
  var page;
  writeFileSync("run.py", "\n");

  var pageOrFileContent;
  var previousResponses: Array<Response> = [];

  for (const step of steps) {
    if (step === "Open browser") page = await openBrowser();

    if (step.startsWith("Search")) {
      var queryString = step.split("Search ")[1].slice(1, -1);
      if (page) {
        await page.goto("https://www.google.com");
        await page.type("#APjFqb", queryString);
        await page.keyboard.press("Enter");
        await sleep(2000);
        const answer = await getAnswerFormGoogle(page, gptPage);
        previousResponses.push({ Search: answer });
      }
    }

    if (step.startsWith("Goto") && page) {
      const url = step.split("Goto ")[1].slice(1, -1);
      await page.goto(url);
      await sleep(1000);
      pageOrFileContent = await getMainContentFromTheWeb(page);
    }

    if (step.startsWith("Read")) {
      const filename = step.split("Read ")[1].slice(1, -1);
      const fileExtension = filename.split(".")[1];
      if (fileExtension === "pdf") {
        try {
          const dataBuffer = readFileSync(`inputFiles/${filename}`);
          console.log(dataBuffer.length);
          const { text } = await PdfParse(dataBuffer);
          pageOrFileContent = text;
        } catch (e) {
          console.log(e);
          console.log("Error Happened");
        }
      }
      if (fileExtension === "txt") {
        pageOrFileContent = readFileSync(`inputFiles/${filename}`).toString();
      }
    }

    if (step.startsWith("Summarize") && pageOrFileContent) {
      console.log(pageOrFileContent.length);
      const summary = await summarize(pageOrFileContent, gptPage);
      previousResponses.push({ Summary: summary });
    }

    if (step.startsWith("Write python code")) {
      const descriptionOfCode = step
        .split("Write python code ")[1]
        .slice(1, -1);
      const templatePrompt = readFileSync(
        "prompts/writeCodePrompt.txt"
      ).toString();
      const replacements = {
        task: descriptionOfCode,
      };
      const prompt = promptTemplate(templatePrompt, replacements);
      const answer = await askGPT(gptPage, prompt);
      const copyCodeIndex = answer.indexOf("Copy code");
      const extractedCode = answer.substring(
        copyCodeIndex + "Copy code".length
      );
      previousResponses.push({ Code: extractedCode });
      appendFileSync("run.py", extractedCode);
      try {
        const stdout = execSync("python run.py");
        return stdout.toString();
      } catch {
        console.log("Something went wrong during the execution of program");
        return;
      }
    }

    if (step.startsWith("Display")) {
      let context = "";
      for (const response of previousResponses) {
        const key = Object.keys(response)[0];
        context += `${key}: \n ${response[key]} \n`;
      }

      const finalAnswer = await getFinalAnswer(gptPage, userTask, context);
      console.log(finalAnswer);
      writeFileSync("answer.txt", finalAnswer);
    }
  }
}

async function getAnswerFormGoogle(page: Page, gptPage: Page) {
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

async function getFinalAnswer(
  gptPage: Page,
  question: string,
  context: string
) {
  const prompt = `From the given context\n CONTEXT: \n${context}.\nGive me the answer in a well formatted natural language for the given question:\n ${question}`;
  const answer = askGPT(gptPage, prompt);
  return answer;
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

async function getMainContentFromTheWeb(page: Page): Promise<string> {
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

async function getWebPageSummary(page: Page, gptPage: Page) {
  const pageContent = await getMainContentFromTheWeb(page);
  return summarize(pageContent, gptPage);
}

async function summarize(pageContent: string, gptPage: Page) {
  var summary = "";
  if (pageContent?.length < 16384) {
    const templatePrompt = readFileSync("prompts/summaryPrompt.txt").toString();
    const replacements = {
      context: pageContent,
    };
    const prompt = promptTemplate(templatePrompt, replacements);
    const summary = await askGPT(gptPage, prompt);
    return summary;
  }

  summary = pageContent;
  while (summary.length > 16384) {
    const textArray = splitText(summary, CHUNK_SIZE);
    summary = "";
    for (const text of textArray) {
      const templatePrompt = readFileSync(
        "prompts/summaryPrompt.txt"
      ).toString();
      const replacements = {
        context: text,
      };
      const prompt = promptTemplate(templatePrompt, replacements);
      const summary_i = await askGPT(gptPage, prompt);
      summary += summary_i;
    }
  }
  return summary;
}
