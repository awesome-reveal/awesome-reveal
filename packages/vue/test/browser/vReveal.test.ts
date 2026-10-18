import { cleanup, render } from "vitest-browser-vue";
import { nextTick, reactive, type StyleValue, version } from "vue";

import { defaultKeyframes } from "@awesome-reveal/test-utils/entrance-fixtures";
import { createStage, intersect } from "@awesome-reveal/test-utils/layout";
import { finishEntrances, trackAnimations, trackObservers } from "@awesome-reveal/test-utils/spies";

import DirectiveBox from "../fixtures/DirectiveBox.vue";

let animate: ReturnType<typeof trackAnimations>;
let observers: ReturnType<typeof trackObservers>;

beforeEach(() => {
  animate = trackAnimations();
  observers = trackObservers();
});

// The stage is below the fold, so the element reveals only when the test scrolls to it.
async function mountBox(options?: object, color?: string, style?: StyleValue) {
  const screen = await render(DirectiveBox, {
    props: { options: { ...options }, color },
    attrs: { style },
    container: createStage(),
  });
  return { screen, element: screen.container.firstElementChild as HTMLElement };
}

describe(`v-reveal (Vue ${version})`, () => {
  it("hides the element until it enters the viewport", async () => {
    const { element } = await mountBox();

    expect(element).toHaveStyle({ opacity: "0" });
    expect(element).toHaveAttribute("data-awesome-reveal", "hidden");
    expect(animate.calls()).toHaveLength(0);
  });

  it("reveals and animates the element when it enters the viewport", async () => {
    const { element } = await mountBox();
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

  it("plays the default keyframes without a value", async () => {
    const screen = await render(DirectiveBox, { container: createStage() });
    await intersect(screen.container.firstElementChild as HTMLElement);

    expect(animate.calls()[0]?.keyframes).toEqual(defaultKeyframes);
  });

  it("passes threshold and duration to core", async () => {
    const { element } = await mountBox({ threshold: 0.5, duration: 300 });
    expect(observers.observerOf(element)?.thresholds).toEqual([0, 0.5]);
    await intersect(element);
    expect(animate.calls()[0]?.options).toMatchObject({ duration: 300 });
  });

  it("follows `when` and does not observe the viewport", async () => {
    const { screen, element } = await mountBox({ when: false });

    expect(observers.observerOf(element)).toBeUndefined();
    expect(element).toHaveStyle({ opacity: "0" });

    await screen.rerender({ options: { keyframes: defaultKeyframes, when: true } });
    finishEntrances(animate);
    expect(element).toHaveStyle({ opacity: "1" });
    expect(animate.calls()).toHaveLength(1);
  });

  it("observes the viewport when the value changes to undefined", async () => {
    const { screen, element } = await mountBox({ when: false });
    expect(observers.observerOf(element)).toBeUndefined();

    await screen.rerender({ options: undefined });
    expect(observers.observerOf(element)).toBeDefined();
    await intersect(element);
    expect(element).not.toHaveAttribute("data-awesome-reveal");
  });

  it("follows a reactive options object that changes in place", async () => {
    const options = reactive({ when: false });
    const screen = await render(DirectiveBox, { props: { options }, container: createStage() });
    options.when = true;
    await nextTick();

    expect(screen.container.firstElementChild).not.toHaveAttribute("data-awesome-reveal");
    expect(animate.calls()).toHaveLength(1);
  });

  it("applies option changes to the next reveal", async () => {
    const { screen, element } = await mountBox({ duration: 300 });
    await screen.rerender({ options: { duration: 400 } });
    await intersect(element);

    expect(animate.calls()[0]?.options).toMatchObject({ duration: 400 });
  });

  it("keeps the element hidden when a patch replaces its style", async () => {
    const { screen, element } = await mountBox({}, "red");
    await screen.rerender({ color: "blue" });

    expect(element).toHaveStyle({ color: "rgb(0, 0, 255)", opacity: "0" });
  });

  it.each([
    ["an object", { opacity: 0.5 }, { opacity: 0.8 }],
    ["a string", "opacity: 0.5", "color: red; opacity: 0.8"],
  ])("keeps the latest opacity of %s style binding", async (_, first, second) => {
    const { screen, element } = await mountBox({}, undefined, first);
    await screen.rerender({ style: second } as never);

    expect(element).toHaveStyle({ opacity: "0" });
    expect(element).toHaveAttribute("data-awesome-reveal", "hidden");
    await intersect(element);
    finishEntrances(animate);
    expect(element.style.opacity).toBe("0.8");
  });

  it("stops the observation and the animation on unmount", async () => {
    const { element } = await mountBox();
    await intersect(element);
    expect(animate.active()).toHaveLength(1);
    cleanup();

    expect(observers.observerOf(element)).toBeUndefined();
    await expect.poll(() => animate.active()).toHaveLength(0);
  });
});
