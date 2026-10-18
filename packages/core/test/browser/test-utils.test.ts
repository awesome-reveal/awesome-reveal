import { describe, expect, it, vi } from "vitest";

import { createStage } from "@awesome-reveal/test-utils/layout";
import { setReducedMotion } from "@awesome-reveal/test-utils/reduced-motion";
import { collectWindowErrors, isCollectedWindowError } from "@awesome-reveal/test-utils/reports";
import { trackAnimations, trackObservers } from "@awesome-reveal/test-utils/spies";

describe("test-utils in a browser", () => {
  it("createStage puts the stage below the fold", () => {
    const stage = createStage();
    expect(stage.getBoundingClientRect().top).toBeGreaterThan(innerHeight);
  });
  it("setReducedMotion changes the media query", async () => {
    await setReducedMotion("reduce");
    expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
  });
  // Runs after the test above in the same page, so it proves the reset of the setup file.
  it("the setup resets reduced motion after each test", () => {
    expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(false);
  });
  it("trackAnimations records the real animation of each call and rejects an easing", () => {
    const tracker = trackAnimations();
    const element = createStage();
    const keyframes = [{ opacity: 0 }, { opacity: 1 }];
    element.animate(keyframes, { duration: 60_000 });
    expect(tracker.calls()).toEqual([
      { element, keyframes, options: { duration: 60_000 }, animation: element.getAnimations()[0] },
    ]);
    expect(tracker.active()).toEqual([element.getAnimations()[0]]);
    tracker.calls()[0]!.animation.cancel();
    expect(tracker.active()).toEqual([]);

    const error = new TypeError("test-utils easing");
    tracker.rejectEasing("invalid", error);
    expect(() => element.animate([{ opacity: 0, easing: "invalid" }], 1000)).toThrow(error);
    expect(() => element.animate([{ opacity: 0 }], { easing: "invalid" })).toThrow(error);
    element.animate([{ opacity: 0 }], 1000);
    expect(tracker.calls()).toHaveLength(2);
  });
  it("trackObservers forgets a disconnected observer", () => {
    const tracker = trackObservers();
    const element = createStage();
    const observer = new IntersectionObserver(() => {});
    observer.observe(element);
    expect(tracker.observerOf(element)).toBe(observer);
    expect(tracker.live()).toEqual([observer]);
    observer.disconnect();
    expect(tracker.observerOf(element)).toBeUndefined();
    expect(tracker.live()).toEqual([]);
  });
  it("the console setup accepts only the relay of a collected window error", () => {
    const stop = collectWindowErrors();
    customElements.define(
      "x-throws",
      class extends HTMLElement {
        connectedCallback() {
          throw new SyntaxError("test-utils relay");
        }
      },
    );
    document.body.append(document.createElement("x-throws"));
    expect(stop()).toEqual([expect.any(SyntaxError)]);
    expect(
      vi.mocked(console.error).mock.calls.filter((args) => !isCollectedWindowError(args)),
    ).toEqual([]);
  });
});
