import { readFileSync, writeFileSync } from "fs";
import { askGPT } from "./src/askGPT";
import { initializeApp } from "./src/initializeApp";
import { promptTemplate } from "./utils/promptTemplate";
import { recursiveAnswering } from "./src/RecursiveAnswering";
import ps from "prompt-sync";
const prompt = ps();
async function run() {
  const [browser, page] = await initializeApp(false);
  let userPrompt;
  while (true) {
    userPrompt = prompt("Enter the prompt for auto gpt : ");
    if (!userPrompt) continue;
    if (userPrompt == ":q") break;

    const replacements = {
      problem: userPrompt,
    };

    const templatePrompt = readFileSync("prompts/planPrompt.txt").toString();
    let finalPrompt = promptTemplate(templatePrompt, replacements);
    const questionString = await askGPT(page, finalPrompt);
    writeFileSync("questions.txt", questionString);
    let questions;
    try {
      questions = JSON.parse(`${questionString}`) as Array<string>;
      console.log(questions);
      try {
        await recursiveAnswering(page, questions);
      } catch (e) {
        console.log(e);
      }
    } catch (e) {
      console.log("GPT did not give correct answer");
    }
  }
}
run();
