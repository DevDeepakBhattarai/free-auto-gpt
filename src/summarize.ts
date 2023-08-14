import { readFileSync } from "fs";
import { promptTemplate } from "../utils/promptTemplate";
import { askGPT } from "./askGPT";
import { splitText } from "../utils/splitText";
import { Page } from "puppeteer";
const CHUNK_SIZE = 16000;

export async function summarize(pageContent: string, gptPage: Page) {
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
