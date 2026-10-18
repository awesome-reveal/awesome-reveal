import "../../src/index";
import vueCss from "../../src/reveal.css?raw";
import reactCss from "../../../react/src/reveal.css?raw";

describe("reveal.css", () => {
  it("has the same reveal.css as the React package", () => {
    expect(vueCss).not.toBe("");
    expect(vueCss).toBe(reactCss);
  });

  it("is installed by the import of the package", () => {
    expect(
      document.querySelector('style[data-vite-dev-id$="/packages/vue/src/reveal.css"]'),
    ).not.toBeNull();
  });
});
