import { Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import recaptcha from "puppeteer-extra-plugin-recaptcha";
import stealth from "puppeteer-extra-plugin-stealth";
import { askGPT } from "./askGPT";
import { readFileSync, writeFileSync } from "fs";
import { promptTemplate } from "../utils/promptTemplate";
import { sleep } from "../utils/sleep";
import cheerio, { Cheerio, load, Element, CheerioAPI, AnyNode } from "cheerio";
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
        const html = await getPageContent(page);
        const templatePrompt = readFileSync(
          "prompts/htmlPrompt.txt"
        ).toString();
        const replacements = {
          html: html,
        };
        const prompt = promptTemplate(templatePrompt, replacements);
        const answer = await askGPT(gptPage, prompt);
        return answer;
      }
    }
  }
}

async function openBrowser(): Promise<Page> {
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-UK,en",
  });
  await page.goto("https://www.google.com");
  return page;
}

async function getPageContent(page: Page) {
  const title = await page.evaluate(() => {
    return document.title;
  });

  const html = await page.evaluate(() => {
    return document.body.innerHTML;
  });

  return "QUESTION: " + title + "\n\n" + "HTML" + "\n" + parseHTML(html);
}

function parseHTML(html: string = "") {
  const $ = load(html);
  let formattedContent = "";

  function getContent(element: Cheerio<Element>): string {
    return element.length && element.text()
      ? element.text().trim().substring(0, 200) + "..."
      : "";
  }

  function formatElement(selector: string) {
    $(selector).each((index, element) => {
      element = element as Element;
      const classname = element.attribs["classname"];
      const role = element.attribs["role"];
      const dataVed = element.attribs["data-ved"];
      const content = getContent($(element as Element));
      if (content.trim() !== "" && content.trim() !== "..." && dataVed)
        formattedContent += `<${element.tagName} data-ved=${
          element.attribs["data-ved"]
        }  ${classname ? "className=" + classname : ""} ${
          role ? "role=" + role : ""
        }>${content.substring(0, 200)}</${element.tagName}>\n`;

      if (element.tagName === "div") {
        const content = getContent($(element as Element));
        formattedContent += `<${element.tagName} ${
          classname ? "className=" + classname : ""
        } ${role ? "role=" + role : ""}>${content.substring(0, 200)}</${
          element.tagName
        }>\n`;
      }
    });
  }
  formatElement("div.ULSxyf:first-of-type");
  formatElement("button");
  formatElement("a");
  return formattedContent;
}
