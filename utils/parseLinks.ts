import { load, Element, AnyNode, Cheerio } from "cheerio";
export function parseLinks(html: string = "") {
  const $ = load(html);
  let formattedContent = "";

  function getContent(element: Cheerio<Element>): string {
    return element.length && element.text()
      ? element.text().trim().substring(0, 200)
      : "";
  }

  function formatElement(selector: string) {
    $(selector).each((index, element) => {
      element = element as Element;
      const dataVed = element.attribs["data-ved"];
      const content = getContent($(element as Element));
      if (content.trim() !== "" && content.trim() !== "..." && dataVed)
        formattedContent += `<${element.tagName} data-ved="${
          element.attribs["data-ved"]
        }"> ${content.substring(0, 200)}</${element.tagName}>\n`;

      if (element.tagName === "div") {
        const content = getContent($(element as Element));
        formattedContent += `<${element.tagName} >${content.substring(
          0,
          200
        )}</${element.tagName}>\n`;
      }
    });
  }
  formatElement("div.ULSxyf:first-of-type");
  formatElement("button");
  formatElement("a");
  return formattedContent;
}
