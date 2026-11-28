import { render } from "svelte/server";

import { describeSSRContract } from "@awesome-reveal/test-utils/contract-ssr";

import CascadeList from "./fixtures/CascadeList.svelte";
import Contract from "./fixtures/Contract.svelte";
import { cascadeListMarkup, revealCardMarkup } from "./fixtures/markup";
import RevealCard from "./fixtures/RevealCard.svelte";

const css = (style: Record<string, string> = {}) =>
  Object.entries(style)
    .map(([name, value]) => `${name}: ${value}`)
    .join("; ") || undefined;

// The setup fails the test if Svelte warns.
describe("server render", () => {
  it("renders the Reveal component hidden", () => {
    expect(render(RevealCard).body).toBe(revealCardMarkup);
  });

  it("renders the Reveal component hidden with when", () => {
    expect(render(RevealCard, { props: { when: true } }).body).toBe(revealCardMarkup);
  });

  it("renders the Cascade component with hidden children", () => {
    expect(render(CascadeList).body).toBe(cascadeListMarkup);
  });

  it("renders no hidden state for an attachment, which runs only in the browser", () => {
    expect(render(Contract, { props: { kind: "reveal", options: {} } }).body).not.toContain(
      "data-awesome-reveal",
    );
  });
});

describeSSRContract("Svelte Reveal", {
  async render(options, style) {
    return render(Contract, { props: { kind: "Reveal", options, style: css(style) } }).body;
  },
});

describeSSRContract(
  "Svelte Cascade",
  {
    async render(options, style) {
      return render(Contract, { props: { kind: "Cascade", options, style: css(style) } }).body;
    },
  },
  "cascade",
);
