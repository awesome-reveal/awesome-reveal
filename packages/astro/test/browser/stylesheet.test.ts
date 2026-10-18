import astroCss from "../../src/reveal.css?raw";
import reactCss from "../../../react/src/reveal.css?raw";

describe("reveal.css", () => {
  it("has the same reveal.css as the React package", () => {
    expect(astroCss).not.toBe("");
    expect(astroCss).toBe(reactCss);
  });

  it("is installed by the setup file, as Host.astro installs it", () => {
    expect(
      document.querySelector('style[data-vite-dev-id$="/packages/astro/src/reveal.css"]'),
    ).not.toBeNull();
  });
});
