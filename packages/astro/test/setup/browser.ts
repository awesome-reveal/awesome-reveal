import "@awesome-reveal/test-utils/setup/browser";
// Host.astro imports this file, and the browser project cannot compile .astro files.
import "../../src/reveal.css";

import { RevealElement } from "../../src/element";

customElements.define("awesome-reveal", RevealElement);

afterEach(() => {
  document.body.innerHTML = "";
});
