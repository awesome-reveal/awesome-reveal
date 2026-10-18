import { describe, expect, it, vi } from "vitest";

import { createStage } from "@awesome-reveal/test-utils/layout";
import { setReducedMotion } from "@awesome-reveal/test-utils/reduced-motion";
import { collectWindowErrors, isCollectedWindowError } from "@awesome-reveal/test-utils/reports";
import {
  interceptObserver,
  trackAnimations,
  trackObservers,
} from "@awesome-reveal/test-utils/spies";

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
    const [call] = tracker.calls();
    expect(tracker.calls()).toHaveLength(1);
    expect(call!.element).toBe(element);
    expect(call!.keyframes).toBe(keyframes);
    expect(call!.options).toEqual({ duration: 60_000 });
    expect(call!.animation).toBe(element.getAnimations()[0]);
    expect(tracker.active()).toHaveLength(1);
    expect(tracker.active()[0]).toBe(call!.animation);
    call!.animation.cancel();
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
  it("interceptObserver sends entries to the callback of the last real observer", () => {
    const report = interceptObserver();
    const first = vi.fn();
    const last = vi.fn();
    new IntersectionObserver(first);
    const observer = new IntersectionObserver(last);
    expect(observer).toBeInstanceOf(IntersectionObserver);
    const entry = { intersectionRatio: 0.5 } as IntersectionObserverEntry;
    report(entry, entry);
    expect(first).not.toHaveBeenCalled();
    expect(last).toHaveBeenCalledOnce();
    expect(last.mock.calls[0]![0]).toEqual([entry, entry]);
    expect(last.mock.calls[0]![1]).toBe(observer);
  });
  it("the console setup accepts only the relay of a collected window error", async () => {
    const stop = collectWindowErrors();
    if (!customElements.get("x-throws")) {
      customElements.define(
        "x-throws",
        class extends HTMLElement {
          connectedCallback() {
            throw new SyntaxError("test-utils relay");
          }
        },
      );
    }
    document.body.append(document.createElement("x-throws"));
    expect(stop()).toEqual([expect.any(SyntaxError)]);

    const calls = () => vi.mocked(console.error).mock.calls;
    await expect.poll(() => calls().filter(isCollectedWindowError).length).toBe(1);
    expect(calls().filter((args) => !isCollectedWindowError(args))).toEqual([]);

    expect(isCollectedWindowError([new Error("not collected")])).toBe(false);
    expect(isCollectedWindowError([...calls()[0]!, "extra"])).toBe(false);
  });
});
