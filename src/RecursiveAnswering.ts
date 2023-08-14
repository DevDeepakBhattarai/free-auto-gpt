import { execSync } from "child_process";
import { appendFileSync, readFileSync, writeFileSync } from "fs";
import PdfParse from "pdf-parse";
import { Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import recaptcha from "puppeteer-extra-plugin-recaptcha";
import stealth from "puppeteer-extra-plugin-stealth";
import { openBrowser } from "../utils/openBrowser";
import { promptTemplate } from "../utils/promptTemplate";
import { sleep } from "../utils/sleep";
import { askGPT } from "./askGPT";
import { getAnswerFormGoogle } from "./getAnswerFromGoogle";
import { getMainContentFromTheWeb } from "./getMainContentFromWeb";
import { goToPlanPage } from "./goToPlanPage";
import { newGPTPage } from "./newGPTPage";
import { summarize } from "./summarize";
puppeteer.use(recaptcha()).use(stealth());

interface Response {
  [key: string]: {};
}

export async function recursiveAnswering(gptPage: Page, userTask: string) {
  let indexOfThePlanPage = 1;
  writeFileSync("run.py", "\n");
  var pageOrFileContent;
  const [page, browser] = await openBrowser();
  var completedTasks: Array<Response> = [];
  let stepToFollow = "";
  while (stepToFollow !== "Done" && stepToFollow !== "Display") {
    const templatePrompt = readFileSync(
      "prompts/stepPlanPrompt.txt"
    ).toString();
    const replacements = {
      task: userTask,
      completed:
        completedTasks.length > 0 ? JSON.stringify(completedTasks) : "None",
    };
    await sleep(100);
    const prompt = promptTemplate(templatePrompt, replacements);
    await goToPlanPage(indexOfThePlanPage, gptPage);
    await sleep(500);
    stepToFollow = await askGPT(gptPage, prompt);
    if (stepToFollow.startsWith('"')) stepToFollow = stepToFollow.slice(1, -1);

    if (stepToFollow.startsWith("Search")) {
      var queryString = stepToFollow.split("Search ")[1].slice(1, -1);
      await page.goto("https://www.google.com");
      await page.type("#APjFqb", queryString);
      await page.keyboard.press("Enter");
      await sleep(2000);
      await newGPTPage(gptPage);
      indexOfThePlanPage++;
      const answer = await getAnswerFormGoogle(page, gptPage);
      completedTasks.push({
        searchQuestion: queryString,
        searchAnswer: answer,
      });
    }

    if (stepToFollow.startsWith("Goto")) {
      const url = stepToFollow.split("Goto ")[1].slice(1, -1);
      await page.goto(url);
      await sleep(1000);
      pageOrFileContent = await getMainContentFromTheWeb(page);
      completedTasks.push({
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
      completedTasks.push({ readFile: true });
    }

    if (
      stepToFollow.startsWith("Summarize") &&
      pageOrFileContent &&
      pageOrFileContent !== ""
    ) {
      console.log(pageOrFileContent.length);
      await newGPTPage(gptPage);
      indexOfThePlanPage++;
      const summary = await summarize(pageOrFileContent, gptPage);
      completedTasks.push({
        summary: `${summary.substring(0, 200)}...`,
      });
    }

    if (stepToFollow.startsWith("Write python code")) {
      await newGPTPage(gptPage);
      indexOfThePlanPage++;
      const descriptionOfCode = stepToFollow
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
      completedTasks.push({ code: extractedCode });
      appendFileSync("run.py", extractedCode);
      try {
        const stdout = execSync("python run.py");
        return stdout.toString();
      } catch {
        console.log("Something went wrong during the execution of program");
        return;
      }
    }

    if (stepToFollow.startsWith("Display") || stepToFollow.startsWith("Done")) {
      let context = "";
      for (const response of completedTasks) {
        const key = Object.keys(response)[0];
        context += `${key}: \n ${response[key]} \n`;
      }
      const finalAnswer = await getFinalAnswer(gptPage, userTask, context);
      console.log(finalAnswer);
      writeFileSync("answer.txt", finalAnswer);
    }
  }
  await browser.close();
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
