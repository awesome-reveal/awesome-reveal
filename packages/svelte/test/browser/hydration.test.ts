import { type Component, flushSync, hydrate, unmount } from "svelte";

import { createStage, intersect } from "@awesome-reveal/test-utils/layout";
import { expectSame, finishEntrances, trackAnimations } from "@awesome-reveal/test-utils/spies";

import CascadeList from "../fixtures/CascadeList.svelte";
import { cascadeListMarkup, revealCardMarkup } from "../fixtures/markup";
import RevealCard from "../fixtures/RevealCard.svelte";

let animate: ReturnType<typeof trackAnimations>;
let app: ReturnType<typeof hydrate> | undefined;

beforeEach(() => {
  animate = trackAnimations();
});

function hydrateMarkup<Props extends Record<string, unknown>>(
  component: Component<Props>,
  markup: string,
  props?: Props,
) {
  const container = createStage();
  container.innerHTML = markup;
  app = hydrate(component, { target: container, props: props ?? ({} as Props) });
  flushSync();
  return container.querySelector<HTMLElement>("section, ul")!;
}

// The setup fails the test on a hydration mismatch warning.
describe("hydration", () => {
  afterEach(async () => {
    if (app) await unmount(app);
    app = undefined;
    document.body.innerHTML = "";
  });

  it("hydrates the Reveal component, then reveals it", async () => {
    const element = hydrateMarkup(RevealCard, revealCardMarkup);

    expect(element).toHaveStyle({ opacity: "0" });
    await intersect(element);
    finishEntrances(animate);
    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expect(element).toHaveStyle({ color: "rgb(255, 0, 0)", opacity: "1" });
    expect(animate.calls()).toHaveLength(1);
  });

  it("hydrates the Reveal component with when hidden, then plays the entrance once", () => {
    const element = hydrateMarkup(RevealCard, revealCardMarkup, { when: true });

    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expectSame(
      animate.calls().map((call) => call.element),
      [element],
    );
  });

  it("hydrates the Cascade component with hidden children, then reveals them in sequence", async () => {
    const element = hydrateMarkup(CascadeList, cascadeListMarkup);
    const children = Array.from(element.children);

    expect(element).toHaveStyle({ opacity: "1" });
    expect(children[0]).toHaveStyle({ opacity: "0" });
    await intersect(element);
    finishEntrances(animate);
    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expect(children[0]).toHaveStyle({ opacity: "1" });
    expectSame(
      animate.calls().map((call) => call.element),
      children,
    );
  });

  it("keeps the server elements", () => {
    const container = createStage();
    container.innerHTML = revealCardMarkup;
    const server = container.querySelector("section");
    app = hydrate(RevealCard, { target: container, props: {} });
    flushSync();

    expect(container.querySelector("section")).toBe(server);
  });
});
