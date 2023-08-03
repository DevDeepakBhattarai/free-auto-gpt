export function formatForMarkDown(text: string) {
  const regex = /\n\n(?!.*\.)\s*(.+):\n\n/g;
  const transformedText1 = text.replaceAll(regex, "\n\n## $1:\n\n");
  const anotherRegex = new RegExp("\\n\n([^#.,/\n]+):", "g");
  const transformedText2 = transformedText1.replaceAll(
    anotherRegex,
    "\n\n- **$1**:\n"
  );
  return wrapCodeBlock(transformedText2);
}

function wrapCodeBlock(text: string) {
  const startTag = "\nCopy code\n";
  const endTag = "\n\n\n";
  const codeBlockStart = "```";
  const codeBlockEnd = "```";

  const startIndex = text.indexOf(startTag);
  const endIndex = text.indexOf(endTag);
  if (startIndex === -1 || endIndex === -1) {
    // If the tags are not found, return the original text.
    console.log("No");
    return text;
  }

  const beforeCode = text.substring(0, startIndex);
  const code = text.substring(startIndex + startTag.length, endIndex);
  const afterCode = text.substring(endIndex + endTag.length);

  // Concatenate the parts with the code block formatting.
  return (
    beforeCode +
    startTag +
    codeBlockStart +
    "\n" +
    code +
    "\n" +
    codeBlockEnd +
    endTag +
    afterCode
  );
}
