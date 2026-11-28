import { createAttachmentKey } from "svelte/attachments";
import { version } from "svelte/package.json";
import { render } from "vitest-browser-svelte";

import { defaultKeyframes } from "@awesome-reveal/test-utils/entrance-fixtures";
import { createStage, intersect } from "@awesome-reveal/test-utils/layout";
import {
  expectSame,
  finishEntrances,
  trackAnimations,
  trackObservers,
} from "@awesome-reveal/test-utils/spies";

import { Cascade, Reveal, type RevealProps } from "../../src/index";
import RevealHost from "../fixtures/RevealHost.svelte";

let animate: ReturnType<typeof trackAnimations>;
let observers: ReturnType<typeof trackObservers>;

beforeEach(() => {
  animate = trackAnimations();
  observers = trackObservers();
});

// The stage is below the fold, so the element reveals only when the test scrolls to it.
async function mountReveal(props: RevealProps = {}) {
  const screen = await render(RevealHost, { target: createStage(), props });
  return { screen, element: screen.container.firstElementChild as HTMLElement };
}

describe(`Reveal (Svelte ${version})`, () => {
  it("renders one hidden div around its children", async () => {
    const { element } = await mountReveal();

    expect(element.tagName).toBe("DIV");
    expect(element).toHaveTextContent("onefalse");
    expect(element).toHaveStyle({ opacity: "0" });
    expect(element).toHaveAttribute("data-awesome-reveal", "hidden");
  });

  it("reveals and animates when it enters the viewport", async () => {
    const { element } = await mountReveal();
    await intersect(element);
    finishEntrances(animate);

    expect(element).toHaveStyle({ opacity: "1" });
    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expect(animate.calls()[0]?.element).toBe(element);
    expect(animate.calls()[0]).toMatchObject({
      keyframes: defaultKeyframes,
      options: { duration: 600, delay: 0, fill: "backwards" },
    });
  });

  it("forwards an attachment of the user to the element", async () => {
    const attached = vi.fn();
    const { element } = await mountReveal({ [createAttachmentKey()]: attached });

    expect(attached).toHaveBeenCalledExactlyOnceWith(element);
  });

  it("starts the animation and removes data-awesome-reveal in the task of the report", async () => {
    const Observer = IntersectionObserver;
    const states: [boolean, number][] = [];
    // A pass-through spy: the real observer reports, and the spy reads the state right after the callback.
    vi.spyOn(globalThis, "IntersectionObserver").mockImplementation(function (callback, options) {
      return new Observer((entries, observer) => {
        callback(entries, observer);
        for (const { isIntersecting, target } of entries) {
          if (isIntersecting) {
            states.push([target.hasAttribute("data-awesome-reveal"), animate.calls().length]);
          }
        }
      }, options);
    });
    const { element } = await mountReveal();
    await intersect(element);

    expect(states).toEqual([[false, 1]]);
  });

  it("calls onReveal with the element, and gives revealed to its children", async () => {
    const onReveal = vi.fn();
    const { screen, element } = await mountReveal({ onReveal });
    await intersect(element);

    await expect.element(element).toHaveTextContent("onetrue");
    expectSame(
      onReveal.mock.calls.map(([target]) => target),
      [element],
    );
    await screen.rerender({ onReveal, when: false });
    await screen.rerender({ onReveal, when: true });
    expect(onReveal).toHaveBeenCalledTimes(2);
  });

  it("passes threshold and duration to core", async () => {
    const { element } = await mountReveal({ threshold: 0.5, duration: 300 });
    expect(observers.observerOf(element)?.thresholds).toEqual([0, 0.5]);
    await intersect(element);
    expect(animate.calls()[0]?.options).toMatchObject({ duration: 300 });
  });

  it("follows `when` and does not observe the viewport", async () => {
    const { screen, element } = await mountReveal({ when: false });

    expect(observers.observerOf(element)).toBeUndefined();
    expect(element).toHaveStyle({ opacity: "0" });

    await screen.rerender({ when: true });
    finishEntrances(animate);
    expect(element).toHaveStyle({ opacity: "1" });
    expect(animate.calls()).toHaveLength(1);
  });

  it("applies option changes to the next reveal without replaying", async () => {
    const { screen, element } = await mountReveal({ duration: 300 });
    await intersect(element);
    await screen.rerender({ duration: 400 });

    expect(animate.calls()).toHaveLength(1);

    await screen.rerender({ duration: 400, when: false });
    await screen.rerender({ duration: 400, when: true });
    expect(animate.calls()[1]?.options).toMatchObject({ duration: 400 });
  });

  it("renders the tag given by `as` and passes attributes through", async () => {
    const { element } = await mountReveal({ as: "section", id: "intro", class: "card" });

    expect(element.tagName).toBe("SECTION");
    expect(element).toHaveAttribute("id", "intro");
    expect(element).toHaveClass("card", { exact: true });
  });

  it.each([Reveal, Cascade])("renders an empty element without children", async (component) => {
    const screen = await render(component, { target: createStage() });

    expect(screen.container.firstElementChild?.children).toHaveLength(0);
  });

  it("owns data-awesome-reveal", async () => {
    const { element } = await mountReveal({ "data-awesome-reveal": "x" } as RevealProps);

    expect(element).toHaveAttribute("data-awesome-reveal", "hidden");
    await intersect(element);
    expect(element).not.toHaveAttribute("data-awesome-reveal");
  });

  it("keeps the given style, which shows its opacity after the reveal", async () => {
    const { element } = await mountReveal({ style: "color: red; opacity: 0.5" });

    expect(element).toHaveStyle({ color: "rgb(255, 0, 0)", opacity: "0" });

    await intersect(element);
    finishEntrances(animate);
    expect(element).toHaveStyle({ color: "rgb(255, 0, 0)", opacity: "0.5" });
  });

  it("stops the observation and the animation on unmount", async () => {
    const { screen, element } = await mountReveal();
    await intersect(element);
    expect(animate.active()).toHaveLength(1);
    await screen.unmount();

    expect(observers.observerOf(element)).toBeUndefined();
    await expect.poll(() => animate.active()).toHaveLength(0);
  });

  it("reveals at once without IntersectionObserver", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { element } = await mountReveal();
    finishEntrances(animate);

    expect(element).toHaveStyle({ opacity: "1" });
    expect(animate.calls()).toHaveLength(1);
  });
});
