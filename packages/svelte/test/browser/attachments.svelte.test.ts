import { flushSync } from "svelte";
import { render } from "vitest-browser-svelte";

import { defaultKeyframes } from "@awesome-reveal/test-utils/entrance-fixtures";
import { createStage, intersect } from "@awesome-reveal/test-utils/layout";
import { finishEntrances, trackAnimations, trackObservers } from "@awesome-reveal/test-utils/spies";

import type { RevealOptions } from "../../src/index";
import AttachmentBox from "../fixtures/AttachmentBox.svelte";
import BareAttachment from "../fixtures/BareAttachment.svelte";

let animate: ReturnType<typeof trackAnimations>;
let observers: ReturnType<typeof trackObservers>;

beforeEach(() => {
  animate = trackAnimations();
  observers = trackObservers();
});

// The stage is below the fold, so the element reveals only when the test scrolls to it.
async function mountBox(options?: RevealOptions, color?: string) {
  const screen = await render(AttachmentBox, { target: createStage(), props: { options, color } });
  return { screen, element: screen.container.firstElementChild as HTMLElement };
}

describe("reveal attachment", () => {
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
    expect(animate.calls()[0]).toMatchObject({
      element,
      keyframes: defaultKeyframes,
      options: { duration: 600, delay: 0, fill: "backwards" },
    });
  });

  it("uses the default options without a getter", async () => {
    const screen = await render(BareAttachment, { target: createStage() });
    const element = screen.container.firstElementChild as HTMLElement;
    expect(element).toHaveAttribute("data-awesome-reveal", "hidden");

    await intersect(element);
    expect(animate.calls()[0]).toMatchObject({ element, keyframes: defaultKeyframes });
  });

  it("follows a state object that changes in place", async () => {
    const options = $state<RevealOptions>({ when: false });
    const { element } = await mountBox(options);

    options.when = true;
    flushSync();
    finishEntrances(animate);

    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expect(animate.calls()).toHaveLength(1);
  });

  it("keeps the store when a property of a state object changes", async () => {
    const onReveal = vi.fn();
    const options = $state<RevealOptions>({ when: true, duration: 300, onReveal });
    await mountBox(options);
    finishEntrances(animate);

    options.duration = 500;
    flushSync();

    expect(animate.calls()).toHaveLength(1);
    expect(onReveal).toHaveBeenCalledOnce();
  });

  it("follows `when` with one observer and one store", async () => {
    const { screen, element } = await mountBox({ when: false });
    expect(observers.observerOf(element)).toBeUndefined();

    await screen.rerender({ options: { when: true } });
    finishEntrances(animate);
    expect(element).toHaveStyle({ opacity: "1" });
    expect(animate.calls()).toHaveLength(1);

    await screen.rerender({ options: {} });
    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expect(observers.live()).toHaveLength(0);
  });

  it("applies option changes to the next reveal without replaying", async () => {
    const { screen, element } = await mountBox({ duration: 300 });
    await intersect(element);
    await screen.rerender({ options: { duration: 400 } });

    expect(animate.calls()).toHaveLength(1);

    await screen.rerender({ options: { duration: 400, when: false } });
    await screen.rerender({ options: { duration: 400, when: true } });
    expect(animate.calls()[1]?.options).toMatchObject({ duration: 400 });
  });

  it("does not run again when onReveal reads and writes state", async () => {
    const reveals = $state({ count: 0 });
    const onReveal = () => reveals.count++;
    const { element } = await mountBox({ when: true, onReveal });
    flushSync();

    expect(reveals.count).toBe(1);
    expect(element).toHaveAttribute("data-awesome-reveal-attached");
    expect(animate.calls()).toHaveLength(1);
  });

  it("keeps the element hidden when a style binding changes", async () => {
    const { screen, element } = await mountBox({}, "red");
    await screen.rerender({ color: "blue" });

    expect(element).toHaveStyle({ color: "rgb(0, 0, 255)", opacity: "0" });
  });

  it("stops the observation and the animation on unmount", async () => {
    const { screen, element } = await mountBox();
    await intersect(element);
    expect(animate.active()).toHaveLength(1);
    await screen.unmount();

    expect(observers.observerOf(element)).toBeUndefined();
    await expect.poll(() => animate.active()).toHaveLength(0);
  });
});
