import { cleanup, render } from "vitest-browser-vue";
import { defineComponent, h, nextTick, ref, Suspense, version } from "vue";

import { defaultKeyframes } from "@awesome-reveal/test-utils/entrance-fixtures";
import { createStage, intersect, settle } from "@awesome-reveal/test-utils/layout";
import {
  expectSame,
  finishEntrances,
  trackAnimations,
  trackObservers,
} from "@awesome-reveal/test-utils/spies";

import { Reveal } from "../../src/Reveal";

import RevealCard from "../fixtures/RevealCard.vue";

let animate: ReturnType<typeof trackAnimations>;
let observers: ReturnType<typeof trackObservers>;

beforeEach(() => {
  animate = trackAnimations();
  observers = trackObservers();
});

// The stage is below the fold, so the element reveals only when the test scrolls to it.
async function mountReveal(
  props: Record<string, unknown> = {},
  attrs: Record<string, unknown> = {},
) {
  const screen = await render(Reveal, {
    props: { ...props },
    attrs,
    slots: { default: () => [h("span", "one"), h("span", "two")] },
    container: createStage(),
  });
  return { screen, element: screen.container.firstElementChild as HTMLElement };
}

describe(`Reveal (Vue ${version})`, () => {
  it("renders one hidden div around its slot", async () => {
    const { element } = await mountReveal();

    expect(element.tagName).toBe("DIV");
    expect(element).toHaveTextContent("onetwo");
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

  it("emits reveal with the element, and gives revealed to its slot", async () => {
    const screen = await render(Reveal, {
      slots: { default: ({ revealed }: { revealed: boolean }) => String(revealed) },
      container: createStage(),
    });
    const element = screen.container.firstElementChild as HTMLElement;
    expect(element).toHaveTextContent("false");

    await intersect(element);
    expect(element).toHaveTextContent("true");
    expectSame(
      screen.emitted<[Element]>("reveal")!.map(([target]) => target),
      [element],
    );
    await screen.rerender({ when: false });
    await screen.rerender({ when: true });
    expect(screen.emitted("reveal")).toHaveLength(2);
  });

  it("plays the default keyframes without keyframes", async () => {
    const { element } = await mountReveal();
    await intersect(element);

    expect(animate.calls()[0]?.keyframes).toEqual(defaultKeyframes);
  });

  it("passes threshold and duration to core", async () => {
    const { element } = await mountReveal({ threshold: 0.5, duration: 300 });
    expect(observers.observerOf(element)?.thresholds).toEqual([0, 0.5]);
    await intersect(element);
    expect(animate.calls()[0]?.options).toMatchObject({ duration: 300 });
  });

  it("observes the viewport without when, because an absent Boolean prop is not false", async () => {
    const { element } = await mountReveal();
    expect(observers.observerOf(element)).toBeDefined();

    await intersect(element);
    finishEntrances(animate);
    expect(element).toHaveStyle({ opacity: "1" });
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

    await screen.rerender({ when: false });
    await screen.rerender({ when: true });
    expect(animate.calls()[1]?.options).toMatchObject({ duration: 400 });
  });

  it("renders the tag given by `as` and passes attributes through", async () => {
    const { element } = await mountReveal({ as: "a" }, { href: "/docs", class: "link" });

    expect(element.tagName).toBe("A");
    expect(element).toHaveAttribute("href", "/docs");
    expect(element).toHaveClass("link", { exact: true });
  });

  it("does not replay the animation when `as` changes after the reveal", async () => {
    const { screen, element } = await mountReveal();
    await intersect(element);
    await screen.rerender({ as: "section" });

    const next = screen.container.firstElementChild!;
    expect(next.tagName).toBe("SECTION");
    expect(next).not.toHaveAttribute("data-awesome-reveal");
    expect(animate.calls()).toHaveLength(1);
  });

  it("plays after a pending Suspense resolves, not before", async () => {
    let resolve!: () => void;
    const Slow = defineComponent(async () => {
      await new Promise<void>((done) => (resolve = done));
      return () => h("p");
    });
    await render(
      {
        render: () =>
          h(Suspense, null, { default: () => h("div", [h(Reveal, { when: true }), h(Slow)]) }),
      },
      { container: createStage() },
    );
    await settle();
    expect(animate.calls()).toHaveLength(0);

    resolve();
    await expect.poll(() => animate.calls().length).toBe(1);
  });

  it("plays with the latest options when a prop changes while Suspense is pending", async () => {
    let resolve!: () => void;
    const Slow = defineComponent(async () => {
      await new Promise<void>((done) => (resolve = done));
      return () => h("p");
    });
    const duration = ref(100);
    await render(
      {
        render: () =>
          h(Suspense, null, {
            default: () => h("div", [h(Reveal, { when: true, duration: duration.value }), h(Slow)]),
          }),
      },
      { container: createStage() },
    );
    duration.value = 900;
    await nextTick();
    await settle();
    resolve();
    await expect.poll(() => animate.calls().length).toBe(1);

    expect(animate.calls()[0]?.options).toMatchObject({ duration: 900 });
  });

  it("keeps the given style, which shows its opacity after the reveal", async () => {
    const { element } = await mountReveal({}, { style: { color: "red", opacity: 0.5 } });

    expect(element).toHaveStyle({ color: "rgb(255, 0, 0)", opacity: "0" });

    await intersect(element);
    finishEntrances(animate);
    expect(element).toHaveStyle({ color: "rgb(255, 0, 0)", opacity: "0.5" });
  });

  it("works in a template", async () => {
    const screen = await render(RevealCard, { container: createStage() });
    const element = screen.container.querySelector("section")!;
    await intersect(element);

    expect(element).toHaveStyle({ color: "rgb(255, 0, 0)" });
    expect(animate.calls()[0]?.keyframes).toEqual(defaultKeyframes);
  });

  it("stops the observation and the animation on unmount", async () => {
    const { element } = await mountReveal();
    await intersect(element);
    expect(animate.active()).toHaveLength(1);
    cleanup();

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
