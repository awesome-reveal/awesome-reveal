import { createSSRApp, h, nextTick, withDirectives } from "vue";
import { renderToString } from "vue/server-renderer";

import { createStage, intersect } from "@awesome-reveal/test-utils/layout";
import { expectSame, finishEntrances, trackAnimations } from "@awesome-reveal/test-utils/spies";

import DirectiveBox from "../fixtures/DirectiveBox.vue";
import RevealCard from "../fixtures/RevealCard.vue";
import { Cascade } from "../../src/Reveal";
import { vCascade } from "../../src/vReveal";

const items = () => [h("li", "a"), h("li", "b")];

let animate: ReturnType<typeof trackAnimations>;
let app: ReturnType<typeof createSSRApp> | undefined;

beforeEach(() => {
  animate = trackAnimations();
});

async function hydrate(
  component: Parameters<typeof createSSRApp>[0],
  props?: Record<string, unknown>,
) {
  const container = createStage();
  container.innerHTML = await renderToString(createSSRApp(component, props));
  app = createSSRApp(component, props);
  app.mount(container);
  return container.firstElementChild as HTMLElement;
}

// The setup fails the test on a hydration mismatch warning.
describe("hydration", () => {
  afterEach(() => {
    app?.unmount();
    app = undefined;
    document.body.innerHTML = "";
  });

  it("hydrates the Reveal component, then reveals it", async () => {
    const element = await hydrate(RevealCard);

    expect(element).toHaveStyle({ opacity: "0" });
    await intersect(element);
    finishEntrances(animate);
    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expect(element).toHaveStyle({ opacity: "1" });
    expect(animate.calls()).toHaveLength(1);
  });

  it("hydrates a v-reveal element, then reveals it", async () => {
    const element = await hydrate(DirectiveBox);

    expect(element).toHaveStyle({ opacity: "0" });
    await intersect(element);
    finishEntrances(animate);
    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expect(element).toHaveStyle({ opacity: "1" });
  });

  it.each([
    ["the Reveal component", RevealCard, { when: true }],
    ["a v-reveal element", DirectiveBox, { options: { when: true } }],
  ])("hydrates %s with when hidden, then plays the entrance once", async (_, component, props) => {
    const element = await hydrate(component, props);

    await nextTick();
    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expectSame(
      animate.calls().map((call) => call.element),
      [element],
    );
  });

  it("hydrates a v-reveal element with a style binding without a mismatch", async () => {
    const element = await hydrate(DirectiveBox, { color: "red" });

    expect(element).toHaveStyle({ color: "rgb(255, 0, 0)", opacity: "0" });
  });

  it.each([
    ["the Cascade component", { render: () => h(Cascade, { as: "ul" }, items) }],
    ["a v-cascade element", { render: () => withDirectives(h("ul", items()), [[vCascade]]) }],
  ])("hydrates %s with hidden children, then reveals them in sequence", async (_, component) => {
    const element = await hydrate(component);
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
});
