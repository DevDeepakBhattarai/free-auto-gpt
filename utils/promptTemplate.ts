export function promptTemplate(
  template: string,
  replacements: { [key: string]: string }
): string {
  let prompt = template;
  for (const key in replacements) {
    const regex = new RegExp(`{${key}}`, "g");
    prompt = prompt.replace(regex, replacements[key]);
  }
  return prompt;
}
