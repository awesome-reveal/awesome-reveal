import { type ReactElement, version } from "react";
import { hydrateRoot, type Root } from "react-dom/client";

import { createStage, intersect } from "@awesome-reveal/test-utils/layout";
import { expectSame, finishEntrances, trackAnimations } from "@awesome-reveal/test-utils/spies";

import { Cascade, Reveal } from "../../src/Reveal";
import { useCascade } from "../../src/useCascade";
import { type RevealOptions, useReveal } from "../../src/useReveal";

function HookBox(options: RevealOptions) {
  const { getProps } = useReveal<HTMLDivElement>(options);
  return (
    <div {...getProps()}>
      <span>one</span>
    </div>
  );
}

function CascadeHookBox() {
  const { getProps } = useCascade<HTMLUListElement>();
  return (
    <ul {...getProps()}>
      <li>a</li>
      <li>b</li>
    </ul>
  );
}

let root: Root | undefined;
let animate: ReturnType<typeof trackAnimations>;

beforeEach(() => {
  animate = trackAnimations();
});

// The server markup is a literal. `useReveal` uses `useLayoutEffect` where `document` exists, and then
// React 18 warns in `renderToString`. ssr.test.tsx checks the real server output.
async function hydrate(html: string, tree: ReactElement) {
  const container = createStage();
  container.innerHTML = html;
  root = hydrateRoot(container, tree);
  const element = container.firstElementChild as HTMLElement;
  await expect.element(element).toHaveAttribute("data-awesome-reveal-attached");
  return element;
}

// The setup fails the test on a hydration mismatch warning.
describe(`hydration (React ${version})`, () => {
  afterEach(() => {
    root?.unmount();
    root = undefined;
    document.body.innerHTML = "";
  });

  it("hydrates Reveal hidden, then reveals it", async () => {
    const element = await hydrate('<div data-awesome-reveal="hidden">x</div>', <Reveal>x</Reveal>);

    expect(element).toHaveStyle({ opacity: "0" });
    expect(animate.calls()).toHaveLength(0);
    await intersect(element);
    finishEntrances(animate);
    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expect(element).toHaveStyle({ opacity: "1" });
    expect(animate.calls()).toHaveLength(1);
  });

  it("hydrates useReveal hidden, then reveals it", async () => {
    const element = await hydrate(
      '<div data-awesome-reveal="hidden"><span>one</span></div>',
      <HookBox />,
    );

    expect(element).toHaveStyle({ opacity: "0" });
    expect(animate.calls()).toHaveLength(0);
    await intersect(element);
    finishEntrances(animate);
    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expect(element).toHaveStyle({ opacity: "1" });
    expect(animate.calls()).toHaveLength(1);
  });

  it("hydrates Reveal with when hidden, then plays the entrance once", async () => {
    const element = await hydrate(
      '<div data-awesome-reveal="hidden">x</div>',
      <Reveal when>x</Reveal>,
    );

    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expectSame(
      animate.calls().map((call) => call.element),
      [element],
    );
  });

  it("hydrates useReveal with when hidden, then plays the entrance once", async () => {
    const element = await hydrate(
      '<div data-awesome-reveal="hidden"><span>one</span></div>',
      <HookBox when />,
    );

    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expectSame(
      animate.calls().map((call) => call.element),
      [element],
    );
  });

  const CascadeBox = () => (
    <Cascade as="ul">
      <li>a</li>
      <li>b</li>
    </Cascade>
  );

  it.each([
    ["Cascade", CascadeBox],
    ["useCascade", CascadeHookBox],
  ])("hydrates %s with hidden children, then reveals them in sequence", async (_, Box) => {
    const element = await hydrate(
      '<ul data-awesome-reveal="cascade"><li>a</li><li>b</li></ul>',
      <Box />,
    );
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
