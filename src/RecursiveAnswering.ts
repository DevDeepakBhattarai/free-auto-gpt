import { Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import recaptcha from "puppeteer-extra-plugin-recaptcha";
import stealth from "puppeteer-extra-plugin-stealth";
import { askGPT } from "./askGPT";
import { readFileSync, writeFileSync } from "fs";
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

export async function recursiveAnswering(gptPage: Page, steps: string[]) {
  await newGPTPage(gptPage);
  var page;
  var content;
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
    if (step.startsWith("Goto") && page) {
      const url = step.split("Goto ")[1].slice(1, -1);
      await page.goto(url);
      await sleep(1000);
      content = await getWebsiteContent(page);
    }

    if (step.startsWith("Read")) {
      const filename = step.split("Read ")[1].slice(1, -1);
      const fileExtension = filename.split(".")[1];
      if (fileExtension === "pdf") {
        try {
          const dataBuffer = readFileSync(`inputFiles/${filename}`);
          console.log(dataBuffer.length);
          const { text } = await PdfParse(dataBuffer);
          content = text;
        } catch (e) {
          console.log(e);
          console.log("Error Happened");
        }
      }
      if (fileExtension === "txt") {
        content = readFileSync(`inputFiles/${filename}`).toString();
      }
    }

    if (step.startsWith("Summarize") && content) {
      console.log(content.length);
      const reasonToSummarize = step.split("Summarize ")[1].slice(1, -1);
      const summary = await summarize(content, gptPage);
      const prompt = `For the given question:\n ${reasonToSummarize}. \nGenerate the answer in a well formatted way(In natural language) from the given context \n CONTEXT: \n ${summary}`;
      const answer = await askGPT(gptPage, prompt);
      writeFileSync("answer.txt", answer);
      console.log(summary);
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
      console.log(answer);
      const copyCodeIndex = answer.indexOf("Copy code");
      const extractedCode = answer.substring(
        copyCodeIndex + "Copy code".length
      );
      writeFileSync("run.py", extractedCode);
      try {
        const stdout = execSync("python run.py");
        console.log(stdout.toString());
      } catch {
        console.log("Something went wrong during the execution of program");
      }
    }
  }
}

async function linkReader(page: Page, gptPage: Page, question: string) {
  const html = await getPageContentForInitialSearch(page);
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

async function getPageContentForInitialSearch(page: Page) {
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
    await page.waitForNavigation();
    await sleep(2000);
    const summary = await getWebPageSummary(page, gptPage);
    const prompt = `For the given question: ${question}.Generate the answer in a well formatted way(In natural language) from the given context 
Context:
${summary}`;
    const answer = await askGPT(gptPage, prompt);
    writeFileSync("answer.txt", answer);
    console.log(answer);
  }

  if ("answer" in response) {
    const prompt = `For the given question: ${question}.
Generate the answer in a well formatted way(In natural language) from the given object
${JSON.stringify(response)}`;
    const answer = await askGPT(gptPage, prompt);
    writeFileSync("answer.txt", answer);
  }
}
async function getWebsiteContent(page: Page): Promise<string> {
  const pageContent = await page.evaluate(() => {
    const content = document.querySelector("main")?.innerText;
    return content;
  });
  if (!pageContent) {
    console.log("Not page content");
    return "";
  }
  return pageContent;
}

async function getWebPageSummary(page: Page, gptPage: Page) {
  const pageContent = await getWebsiteContent(page);
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
