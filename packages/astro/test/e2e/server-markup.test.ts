import { type Browser, chromium } from "playwright";

import { baseURL, isHidden, opacities } from "./example.ts";

describe("example server markup", () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  async function openWithoutElement(options: Parameters<Browser["newPage"]>[0] = {}) {
    const page = await browser.newPage({ baseURL, ...options });
    await page.addInitScript(() => {
      const define = customElements.define.bind(customElements);
      customElements.define = (name, ...rest) => {
        if (name !== "awesome-reveal") define(name, ...rest);
      };
    });
    await page.goto("/");
    return page;
  }

  it("hides the elements before the custom element starts", async () => {
    const page = await openWithoutElement();

    expect(await isHidden(page, "#default")).toBe(true);
    expect(await opacities(page, "#cascade > li")).toEqual(["0", "0", "0"]);
  });

  it("shows the hidden elements for reduced motion before the custom element starts", async () => {
    const page = await openWithoutElement({ reducedMotion: "reduce" });

    expect(await page.$eval("#default", (element) => getComputedStyle(element).opacity)).toBe("1");
    expect(await opacities(page, "#cascade > li")).toEqual(["1", "1", "1"]);
  });
});
