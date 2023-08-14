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
import { sidebarSelector } from "./sidebarSelector";
import { goToPlanPage } from "./goToPlanPage";
const CHUNK_SIZE = 16000;
puppeteer.use(recaptcha()).use(stealth());

interface Response {
  [key: string]: {};
}

export async function recursiveAnswering(
  gptPage: Page,
  steps: string[],
  userTask: string
) {
  var page;
  var browser;
  let indexOfThePlanPage = 1;
  writeFileSync("run.py", "\n");
  var pageOrFileContent;
  var completedTasksForUserProblem: Array<Response> = [];
  for (const step of steps) {
    [page, browser] = await openBrowser();
    var completedTasksForCurrentGoal: Array<Response> = [];
    let stepToFollow = "";
    while (stepToFollow !== "Done") {
      const templatePrompt = readFileSync(
        "prompts/stepPlanPrompt.txt"
      ).toString();
      const replacements = {
        task: step,
        completed:
          completedTasksForCurrentGoal.length > 0
            ? JSON.stringify(completedTasksForCurrentGoal)
            : "None",
      };
      await sleep(100);
      const prompt = promptTemplate(templatePrompt, replacements);
      await goToPlanPage(indexOfThePlanPage, gptPage);
      await sleep(500);
      stepToFollow = await askGPT(gptPage, prompt);
      if (stepToFollow.startsWith('"'))
        stepToFollow = stepToFollow.slice(1, -1);

      if (stepToFollow.startsWith("Search")) {
        var queryString = stepToFollow.split("Search ")[1].slice(1, -1);
        if (page) {
          await page.goto("https://www.google.com");
          await page.type("#APjFqb", queryString);
          await page.keyboard.press("Enter");
          await sleep(2000);
          await newGPTPage(gptPage);
          indexOfThePlanPage++;
          const answer = await getAnswerFormGoogle(page, gptPage);
          completedTasksForCurrentGoal.push({
            searchQuestion: queryString,
            searchAnswer: answer,
          });
        }
      }

      if (stepToFollow.startsWith("Goto") && page) {
        const url = stepToFollow.split("Goto ")[1].slice(1, -1);
        await page.goto(url);
        await sleep(1000);
        pageOrFileContent = await getMainContentFromTheWeb(page);
        completedTasksForCurrentGoal.push({
          navigatedToLink: url,
        });
      }

      if (stepToFollow.startsWith("Read")) {
        const filename = stepToFollow.split("Read ")[1].slice(1, -1);
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
        completedTasksForCurrentGoal.push({ readFile: true });
      }

      if (stepToFollow.startsWith("Summarize") && pageOrFileContent) {
        console.log(pageOrFileContent.length);
        await newGPTPage(gptPage);
        indexOfThePlanPage++;
        const summary = await summarize(pageOrFileContent, gptPage);
        completedTasksForCurrentGoal.push({
          summary: `${summary.substring(0, 200)}...`,
        });
      }

      if (stepToFollow.startsWith("Write python code")) {
        await newGPTPage(gptPage);
        indexOfThePlanPage++;
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
        completedTasksForCurrentGoal.push({ code: extractedCode });
        appendFileSync("run.py", extractedCode);
        try {
          const stdout = execSync("python run.py");
          return stdout.toString();
        } catch {
          console.log("Something went wrong during the execution of program");
          return;
        }
      }

      if (
        stepToFollow.startsWith("Display") ||
        stepToFollow.startsWith("Done")
      ) {
        let context = "";
        for (const response of completedTasksForCurrentGoal) {
          const key = Object.keys(response)[0];
          context += `${key}: \n ${response[key]} \n`;
        }
        const finalAnswer = await getFinalAnswer(gptPage, userTask, context);
        indexOfThePlanPage++;
        completedTasksForUserProblem.push({ task: step, answer: finalAnswer });

        console.log(finalAnswer);
        writeFileSync("answer.txt", finalAnswer);
      }
    }
    await browser.close();
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
  await newGPTPage(gptPage);
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
