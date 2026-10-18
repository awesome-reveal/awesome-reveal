import type { Browser, BrowserType, Page } from "playwright";
import { inject } from "vitest";

export const baseURL = inject("baseURL");

// The page records CSP violations, which the console does not report in every engine.
function recordViolations() {
  const violations: string[] = [];
  Object.assign(window, { violations });
  document.addEventListener("securitypolicyviolation", (event) =>
    violations.push(`${event.violatedDirective} ${event.blockedURI}`),
  );
}

async function revealed(page: Page, selector: string) {
  await page.waitForFunction((selector) => {
    const element = document.querySelector(selector);
    return (
      element !== null &&
      !element.hasAttribute("data-awesome-reveal") &&
      getComputedStyle(element).opacity === "1" &&
      element.getAnimations({ subtree: true }).length === 0
    );
  }, selector);
}

export function opacities(page: Page, selector: string) {
  return page.$$eval(selector, (elements) =>
    elements.map((element) => getComputedStyle(element).opacity),
  );
}

export function isHidden(page: Page, selector: string) {
  return page.$eval(
    selector,
    (element) =>
      element.getAttribute("data-awesome-reveal") === "hidden" &&
      getComputedStyle(element).opacity === "0",
  );
}

// Each browser has its own test file, because Vitest runs files in parallel, but the tests of one file in sequence.
export function describeExample(browserType: BrowserType) {
  const name = browserType.name();
  const skip = Boolean(
    process.env.REVEAL_BROWSERS && !process.env.REVEAL_BROWSERS.split(",").includes(name),
  );

  describe.skipIf(skip)(`example in ${name}`, () => {
    let browser: Browser;
    let page: Page;

    beforeAll(async () => {
      browser = await browserType.launch();
    });

    afterAll(async () => {
      await browser.close();
    });

    beforeEach(async () => {
      page = await browser.newPage({ baseURL, viewport: { width: 1280, height: 720 } });
      await page.addInitScript(recordViolations);
      // Astro does not support `security.csp` with the ClientRouter.
      await page.route("**/*", async (route) => {
        const response = await route.fetch();
        await route.fulfill({
          response,
          headers: { ...response.headers(), "content-security-policy": "style-src-attr 'none'" },
        });
      });
      await page.goto("/");
    });

    afterEach(async () => {
      expect(
        await page.evaluate(() => (window as unknown as { violations: string[] }).violations),
      ).toEqual([]);
      // A route handler can still fetch, for example the server island, when the page closes.
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await page.close();
    });

    it("shows the hidden elements in print, with the rule of reveal.css", async () => {
      expect(await isHidden(page, "#list")).toBe(true);

      await page.emulateMedia({ media: "print" });

      expect(await page.$eval("#list", (element) => getComputedStyle(element).opacity)).toBe("1");
      expect(await opacities(page, "#cascade > li")).toEqual(["1", "1", "1"]);
    });

    it("shows the hidden elements after the hold when the client script is blocked", async () => {
      const blocked = await browser.newPage({ baseURL, viewport: { width: 1280, height: 720 } });
      await blocked.route("**/*", async (route) => {
        const response = await route.fetch();
        await route.fulfill({
          response,
          headers: { ...response.headers(), "content-security-policy": "script-src 'none'" },
        });
      });
      await blocked.goto("/");

      expect(await opacities(blocked, "#list")).toEqual(["0"]);
      await blocked.evaluate(() => {
        for (const animation of document.getAnimations()) animation.finish();
      });
      expect(await opacities(blocked, "#list")).toEqual(["1"]);
      expect(await opacities(blocked, "#cascade > li")).toEqual(["1", "1", "1"]);
      await blocked.unrouteAll({ behavior: "ignoreErrors" });
      await blocked.close();
    });

    it("shows the content without JavaScript", async () => {
      const noScript = await browser.newPage({ baseURL, javaScriptEnabled: false });
      await noScript.goto("/");

      expect(
        await noScript.$eval("#list", (element) => [
          element.getAttribute("data-awesome-reveal"),
          getComputedStyle(element).opacity,
        ]),
      ).toEqual(["hidden", "1"]);
      expect(await opacities(noScript, "#cascade > li")).toEqual(["1", "1", "1"]);
      await noScript.close();
    });

    it("keeps an element hidden after the hold when the script has attached it", async () => {
      await page.evaluate(() => {
        for (const animation of document.getAnimations()) animation.finish();
      });

      expect(await isHidden(page, "#list")).toBe(true);
      expect(await opacities(page, "#cascade > li")).toEqual(["0", "0", "0"]);
    });

    it("reveals the element in the viewport, and keeps the others hidden", async () => {
      await revealed(page, "#default");

      expect(await isHidden(page, "#list")).toBe(true);
    });

    it("reveals an element when it scrolls into the viewport, as one composition", async () => {
      await page.locator("#list").scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () => !document.querySelector("#list")!.hasAttribute("data-awesome-reveal"),
      );

      expect(
        await page.$$eval("#list", (items) => items.map((item) => item.getAnimations().length)),
      ).toEqual([1]);
      await revealed(page, "#list");
    });

    it("hides the children of a cascade, then reveals them in sequence", async () => {
      expect(
        await page.$eval("#cascade", (element) => element.getAttribute("data-awesome-reveal")),
      ).toBe("cascade");
      expect(await opacities(page, "#cascade > li")).toEqual(["0", "0", "0"]);

      await page.locator("#cascade").scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () => !document.querySelector("#cascade")!.hasAttribute("data-awesome-reveal"),
      );

      expect(
        await page.$$eval("#cascade > li", (items) =>
          items.map((item) => item.getAnimations()[0]?.effect?.getTiming().delay),
        ),
      ).toEqual([0, 80, 160]);
      await revealed(page, "#cascade");
      expect(await opacities(page, "#cascade > li")).toEqual(["1", "1", "1"]);
    });

    it("keeps a table inside its host and reveals it with its rows intact", async () => {
      expect(await isHidden(page, "#table")).toBe(true);
      expect(await page.locator("awesome-reveal > #table > tbody > tr").count()).toBe(2);

      await page.locator("#table").scrollIntoViewIfNeeded();
      await revealed(page, "#table");

      expect(await page.locator("#table td").allTextContents()).toEqual(["One", "Two"]);
    });

    it("keeps the attributes of the element", async () => {
      const title = page.locator(".title");
      await title.scrollIntoViewIfNeeded();
      await revealed(page, ".title");

      expect(
        await title.evaluate((element: HTMLElement) => [
          element.localName,
          element.title,
          getComputedStyle(element).color,
        ]),
      ).toEqual(["h2", "A title attribute", "rgb(0, 128, 128)"]);
    });

    it("reveals an element in a server island", async () => {
      const island = page.locator("#server-island");
      await island.scrollIntoViewIfNeeded();

      await revealed(page, "#server-island");
    });

    it("reveals with the `when` property, and dispatches a reveal event", async () => {
      await page.locator("#toggle").scrollIntoViewIfNeeded();
      expect(await isHidden(page, "#manual")).toBe(true);
      expect(await page.$eval("#manual", (element: HTMLElement) => element.hidden)).toBe(true);

      await page.locator("#toggle").click();

      expect(await page.locator("#toggle").getAttribute("aria-expanded")).toBe("true");
      expect(await page.$eval("#manual", (element: HTMLElement) => element.hidden)).toBe(false);
      await revealed(page, "#manual");
      expect(await page.locator("#reveal-count").textContent()).toBe("1");
    });

    it("reveals the elements of a page after a ClientRouter navigation", async () => {
      await page.getByRole("link", { name: "Other page", exact: true }).click();
      await page.waitForURL("/other");

      await revealed(page, "#other");
    });

    it("reveals a Reveal with transition:persist after a navigation", async () => {
      await page.getByRole("link", { name: "Other page", exact: true }).click();
      await page.waitForURL("/other");
      expect(await isHidden(page, "#persisted-reveal")).toBe(true);

      await page.locator("#persisted-reveal").scrollIntoViewIfNeeded();

      await revealed(page, "#persisted-reveal");
    });

    it("does not play a transition:persist element again after a navigation", async () => {
      await page.locator("#persisted").scrollIntoViewIfNeeded();
      await revealed(page, "#persisted");
      await page.$eval("#persisted", (element) => element.setAttribute("data-before", ""));

      await page.getByRole("link", { name: "Go to the other page" }).click();
      await page.waitForURL("/other");
      // Lets the queued disconnection and IntersectionObserver callbacks run.
      await page.waitForTimeout(100);

      expect(
        await page.$eval("#persisted", (element) => [
          element.hasAttribute("data-before"),
          element.hasAttribute("data-awesome-reveal"),
          element.getAnimations().length,
        ]),
      ).toEqual([true, false, 0]);
    });
  });
}
