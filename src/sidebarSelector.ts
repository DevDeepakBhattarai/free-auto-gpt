import { Page } from "puppeteer";

export function sidebarSelector(number: number) {
  return `#__next > div.overflow-hidden.w-full.h-full.relative.flex.z-0 > div.dark.flex-shrink-0.overflow-x-hidden.bg-gray-900 > div > div > div > nav > div.flex-col.flex-1.transition-opacity.duration-500.overflow-y-auto.-mr-2 > div > div > span:nth-child(1) > div:nth-child(1) > ol > li:nth-child(${number})`;
}
