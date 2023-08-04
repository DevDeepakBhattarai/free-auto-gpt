export function splitText(text: string, chunkSize: number) {
  const textArray = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    let nextIndex = currentIndex + chunkSize;
    if (nextIndex >= text.length) {
      nextIndex = text.length;
    } else {
      // Find the nearest full stop from the nextIndex
      const lastFullStopIndex = text.lastIndexOf(".", nextIndex);
      if (lastFullStopIndex > currentIndex) {
        nextIndex = lastFullStopIndex + 1; // Include the full stop in the chunk
      }
    }
    const partOfTheText = text.substring(currentIndex, nextIndex);
    textArray.push(partOfTheText);
    currentIndex = nextIndex;
  }

  return textArray;
}
