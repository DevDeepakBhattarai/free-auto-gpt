import ps from "prompt-sync";
import { initializeApp } from "./lib/initializeApp";
import { recursiveAnswering } from "./src/RecursiveAnswering";

const prompt = ps();
async function run() {
  const [_, page] = await initializeApp(false);
  let userPrompt;
  while (true) {
    userPrompt = prompt("Enter the prompt for auto gpt : ");
    if (!userPrompt) continue;
    if (userPrompt == ":q") break;
    try {
      await recursiveAnswering(page, userPrompt);
    } catch (e) {
      console.log(e);
      continue;
    }
  }
}
run();
