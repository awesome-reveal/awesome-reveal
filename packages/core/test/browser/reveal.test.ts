import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reveal, cascade, type RevealHandle, type RevealOptions } from "../../src/index";
import { collectReports } from "@awesome-reveal/test-utils/reports";
import {
  createStage,
  mountBelowTheFold,
  scrollIntoView,
  scrollToTop,
  settle,
  showPart,
} from "@awesome-reveal/test-utils/layout";
import { setReducedMotion } from "@awesome-reveal/test-utils/reduced-motion";
import {
  interceptObserver,
  trackAnimations,
  trackObservers,
  withoutAnimate,
} from "@awesome-reveal/test-utils/spies";

let target: HTMLElement;
let handles: RevealHandle[];
const track = (handle: RevealHandle) => {
  handles.push(handle);
  return handle;
};
const opacity = (element: Element = target) => getComputedStyle(element).opacity;
const animation = (element = target) => element.getAnimations()[0]!;
const native = { keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: 60_000 };
let run = 0;

beforeEach(() => {
  target = mountBelowTheFold();
  handles = [];
});
afterEach(() => {
  for (const handle of handles) handle.dispose();
  document.body.innerHTML = "";
});
async function enter(element = target) {
  scrollIntoView(element);
  await expect.poll(() => animation(element)?.playState).toBe("running");
}

const entry = (
  intersectionRatio: number,
  boundingClientRect = { width: 100, height: 100 },
  rootBounds: { width: number; height: number } | null = { width: innerWidth, height: innerHeight },
) =>
  ({
    target,
    intersectionRatio,
    isIntersecting: intersectionRatio > 0,
    boundingClientRect,
    rootBounds,
  }) as unknown as IntersectionObserverEntry;

describe("zero-CSS reveal", () => {
  it("applies the first frame immediately and reveals the resting author style", async () => {
    const styles = document.querySelectorAll("style").length;
    const handle = track(reveal(target));
    expect(Object.keys(handle)).toEqual(["dispose"]);
    expect(opacity()).toBe("0");
    expect(target.style.cssText).toBe("height: 100px;");
    expect(document.querySelectorAll("style").length).toBe(styles);
    expect(animation().effect!.getTiming().duration).toBe(600);
    expect(getComputedStyle(target).translate).toBe("0px");
    expect((animation().effect as KeyframeEffect).getKeyframes()).toContainEqual(
      expect.objectContaining({ translate: "0px 24px" }),
    );
    await enter();
    animation().finish();
    expect(opacity()).toBe("1");
    scrollToTop();
    await settle();
    expect(opacity()).toBe("1");
  });
  it.each(["left", "right", "top", "bottom"] as const)("reveals from %s", async (from) => {
    track(reveal(target, { from, duration: 60_000 }));
    expect(opacity()).toBe("0");
    await enter();
    animation().finish();
    expect(opacity()).toBe("1");
  });
  it("a custom object does not add defaults and preserves resting transforms", () => {
    target.style.transform = "rotate(10deg)";
    track(reveal(target, { from: { opacity: 0 } }));
    expect(getComputedStyle(target).transform).toBe(
      "matrix(0.984808, 0.173648, -0.173648, 0.984808, 0, 0)",
    );
    expect((animation().effect as KeyframeEffect).getKeyframes()).toHaveLength(2);
  });
  it("applies transform-only custom state without a fade", () => {
    track(reveal(target, { from: { scale: 0.9, rotate: "-5deg", blur: "0.5rem" } }));
    expect(opacity()).toBe("1");
    expect(getComputedStyle(target)).toMatchObject({
      scale: "0.9",
      rotate: "-5deg",
      filter: "blur(8px)",
    });
  });
  // Chromium runs an effect with an additive keyframe on the main thread, where it stutters.
  it("generates only replace keyframes, so the browser can composite the entrance", () => {
    track(reveal(target, { from: { opacity: 0, x: 24, scale: 0.9, rotate: 5, blur: 8 } }));
    const effect = animation().effect as KeyframeEffect;
    expect(effect.composite).toBe("replace");
    expect(effect.getKeyframes().map((keyframe) => keyframe.composite)).toEqual([
      "auto",
      "auto",
      "auto",
    ]);
  });
  it("replaces the element's own individual transforms, filter and opacity until the end", () => {
    Object.assign(target.style, {
      transform: "scale(2)",
      translate: "10px 0px",
      rotate: "10deg",
      filter: "brightness(0.5)",
      opacity: "0.5",
    });
    track(reveal(target, { from: { opacity: 0.2, x: 24, rotate: 5, blur: 8 }, duration: 1000 }));
    const style = getComputedStyle(target);
    expect(style).toMatchObject({
      opacity: "0.2",
      translate: "24px",
      rotate: "5deg",
      filter: "blur(8px)",
      transform: "matrix(2, 0, 0, 2, 0, 0)",
    });
    animation().currentTime = 999;
    expect(Number(style.opacity)).toBeCloseTo(1, 2);
    animation().currentTime = 1000;
    expect(style).toMatchObject({
      opacity: "0.5",
      translate: "10px",
      rotate: "10deg",
      filter: "brightness(0.5)",
      transform: "matrix(2, 0, 0, 2, 0, 0)",
    });
  });
  it("moves the offset in screen pixels when the element has its own scale", () => {
    target.style.transform = "scale(2)";
    track(reveal(target, { from: { x: 24 }, duration: 1000 }));
    const start = target.getBoundingClientRect().x;
    animation().currentTime = 1000;
    expect(start - target.getBoundingClientRect().x).toBeCloseTo(24);
  });
  it.each<[string, RevealOptions]>([
    ["from", { from: "left", duration: 60_000 }],
    ["keyframes", native],
  ])("delay holds the start state of %s until the delay ends", async (_, options) => {
    track(reveal(target, { ...options, delay: 60_000 }));
    await enter();
    expect(opacity()).toBe("0");
    animation().currentTime = 59_999;
    expect(opacity()).toBe("0");
    animation().currentTime = 90_000;
    expect(Number(opacity())).toBeGreaterThan(0);
    expect(Number(opacity())).toBeLessThan(1);
  });
  it("plays once and stays revealed when the element leaves and enters again", async () => {
    track(reveal(target, native));
    await enter();
    animation().finish();
    scrollToTop();
    await settle();
    scrollIntoView(target);
    await settle();
    expect(opacity()).toBe("1");
    expect(target.getAnimations()).toEqual([]);
  });
  it.each(["finish", "cancel"] as const)(
    "does not play a waiting entrance that page code called %s() on",
    async (method) => {
      track(reveal(target, native));
      const effect = animation();
      effect[method]();
      expect(opacity()).toBe("1");
      scrollIntoView(target);
      await settle();
      expect(effect.playState).toBe(method === "finish" ? "finished" : "idle");
      expect(opacity()).toBe("1");
    },
  );
  it("plays a waiting entrance that page code paused", async () => {
    track(reveal(target, native));
    animation().pause();
    await enter();
  });
  it("waits for the threshold", async () => {
    track(reveal(target, { ...native, threshold: 0.8 }));
    showPart(target, 0.5);
    await settle();
    expect(animation().playState).toBe("paused");
    await enter();
  });
  it("reveals a hidden start state whose offset an ancestor clips", async () => {
    document.body.innerHTML = `<div style="height: 150vh"></div><div id="clip" style="height: 10px; overflow: hidden"><div id="small" style="height: 10px">a</div></div><div style="height: 150vh"></div>`;
    const small = document.getElementById("small")!;
    track(reveal(small));
    expect(opacity(small)).toBe("0");
    scrollIntoView(document.getElementById("clip")!);
    await expect.poll(() => animation(small).playState).toBe("running");
  });
  it("reveals an element taller than the viewport at its entry when it cannot reach the threshold", async () => {
    const observers = trackObservers();
    target.style.height = "300vh";
    track(reveal(target, { ...native, threshold: 0.5 }));
    await settle();
    expect(animation().playState).toBe("paused");
    scrollTo(0, target.offsetTop - innerHeight / 2);
    await expect.poll(() => animation().playState).toBe("running");
    expect(observers.observerOf(target)).toBeUndefined();
  });
  describe("focus shows the element at once, with no entrance", () => {
    const link = (element = target) => element.querySelector("a")!;
    beforeEach(() => {
      target.innerHTML = `<a href="#">a</a><a href="#">b</a><a href="#">c</a>`;
    });
    async function expectShown(...elements: Element[]) {
      for (const element of elements) {
        expect(opacity(element)).toBe("1");
        expect(getComputedStyle(element).translate).toBe("none");
        expect(element.getAnimations()).toEqual([]);
      }
      await settle();
      for (const element of elements) expect(opacity(element)).toBe("1");
    }
    it.each([
      ["a long delay", { delay: 60_000 }],
      ["no delay", { duration: 60_000 }],
      ["native keyframes", native],
    ])("with %s, also below the threshold", async (_, options: RevealOptions) => {
      track(reveal(target, { ...options, threshold: 0.8 }));
      showPart(target, 0.5);
      await settle();
      expect(opacity()).toBe("0");
      link().focus();
      await expectShown(target);
    });
    it("in a later child of a cascade with an interval", async () => {
      track(cascade(target, { duration: 60_000, interval: 10_000 }));
      expect(opacity(target.lastElementChild!)).toBe("0");
      (target.lastElementChild as HTMLElement).focus();
      await expectShown(...target.children);
    });
    it.each([
      ["its delay", { delay: 60_000 }],
      ["its entrance", { duration: 60_000 }],
    ])("during %s", async (_, options: RevealOptions) => {
      track(reveal(target, options));
      await enter();
      link().focus();
      await expectShown(target);
    });
    it("during the interval of a later child of a cascade", async () => {
      track(cascade(target, { duration: 60_000, interval: 10_000 }));
      await enter(target.firstElementChild as HTMLElement);
      (target.lastElementChild as HTMLElement).focus();
      await expectShown(...target.children);
    });
    it("when the element has focus before the reveal starts", async () => {
      link().focus();
      track(reveal(target, { delay: 60_000 }));
      await expectShown(target);
    });
    it("stops listening at disposal", () => {
      const listen = vi.spyOn(target, "addEventListener");
      const unlisten = vi.spyOn(target, "removeEventListener");
      track(reveal(target, native)).dispose();
      expect(listen).toHaveBeenCalledWith("focusin", expect.any(Function));
      expect(new Set(unlisten.mock.calls)).toEqual(new Set(listen.mock.calls));
      expect(unlisten).toHaveBeenCalledTimes(listen.mock.calls.length);
    });
  });
  it("reveals an element taller than its scroll container when it leaves before the threshold", async () => {
    document.body.innerHTML = `<div id="scroller" style="height: 300px; overflow: auto"><div style="height: 400px"></div><div id="tall" style="height: 900px"></div><div style="height: 400px"></div></div>`;
    const scroller = document.getElementById("scroller")!;
    const tall = document.getElementById("tall")!;
    track(reveal(tall, { ...native, threshold: 0.5 }));
    scroller.scrollTop = 300;
    await settle();
    expect(animation(tall).playState).toBe("paused");
    scroller.scrollTop = 1400;
    await expect.poll(() => animation(tall).playState).toBe("running");
  });
  it.each([false, true])(
    "disposes to resting style before/during animation: %s",
    async (during) => {
      target.style.opacity = "0.5";
      const handle = track(reveal(target, native));
      expect(opacity()).toBe("0");
      if (during) await enter();
      const effect = animation();
      handle.dispose();
      handle.dispose();
      expect(opacity()).toBe("0.5");
      expect(effect.playState).toBe("idle");
      expect(target.getAnimations()).toEqual([]);
      scrollIntoView(target);
      await settle();
      expect(target.getAnimations()).toEqual([]);
    },
  );
  it("invalid native values fail visible and report the browser error", async () => {
    const reports = collectReports();
    track(reveal(target, { keyframes: [{ opacity: 0, easing: "invalid" }, { opacity: 1 }] }));
    expect(opacity()).toBe("1");
    expect(target.getAnimations()).toEqual([]);
    expect(await reports()).toEqual([expect.any(TypeError)]);
  });
  it("reduced motion immediately exposes generated, native and delayed entrances", async () => {
    const observers = trackObservers();
    await setReducedMotion("reduce");
    track(reveal(target, { ...native, delay: 60_000 }));
    track(reveal(target.firstElementChild!));
    expect(opacity()).toBe("1");
    expect(target.getAnimations({ subtree: true })).toEqual([]);
    expect(observers.live()).toHaveLength(0);
  });
  it("print shows the waiting entrances, and the reveal still plays after the print", async () => {
    track(reveal(target, native));
    dispatchEvent(new Event("beforeprint"));
    expect(opacity()).toBe("1");
    dispatchEvent(new Event("afterprint"));
    expect(opacity()).toBe("0");
    await enter();
    expect(animation().currentTime as number).toBeLessThan(60_000);
  });
  it("print shows an entrance in its delay, and it keeps the delay after the print", async () => {
    track(reveal(target, { ...native, delay: 60_000 }));
    await enter();
    dispatchEvent(new Event("beforeprint"));
    expect(opacity()).toBe("1");
    dispatchEvent(new Event("afterprint"));
    expect(opacity()).toBe("0");
    expect(animation().playState).toBe("running");
    expect(animation().currentTime as number).toBeLessThan(60_000);
  });
  it("print does not change a playing entrance", async () => {
    track(reveal(target, native));
    await enter();
    const time = animation().currentTime as number;
    dispatchEvent(new Event("beforeprint"));
    dispatchEvent(new Event("afterprint"));
    expect(animation().playState).toBe("running");
    expect(animation().currentTime as number).toBeGreaterThanOrEqual(time);
    expect(animation().currentTime as number).toBeLessThan(60_000);
  });
  it("invalid thresholds reveal immediately and report the browser error", async () => {
    const reports = collectReports();
    track(reveal(target, { ...native, threshold: 2 }));
    expect(animation().playState).toBe("running");
    expect(await reports()).toEqual([expect.any(RangeError)]);
  });
});

describe("reveal", () => {
  it("passes delay to the animation", () => {
    const animate = trackAnimations();
    track(reveal(target, { delay: 200 }));
    expect(animate.calls()[0]!.options).toEqual({ duration: 600, delay: 200, fill: "backwards" });
    expect(animation().effect!.getTiming().delay).toBe(200);
  });
  it("passes native keyframes unchanged and honors duration", () => {
    const animate = trackAnimations();
    const keyframes: Keyframe[] = [
      { opacity: 0, transform: "scale(.8)", easing: "ease-in", offset: 0, composite: "replace" },
      { opacity: 1, transform: "scale(1)" },
    ];
    track(reveal(target, { keyframes, duration: 500 }));
    expect(animate.calls()[0]!.keyframes).toBe(keyframes);
    expect(animation().effect!.getTiming().duration).toBe(500);
  });
  it("waits for the threshold when the element can reach it in the viewport", async () => {
    const observers = trackObservers();
    target.style.height = "150vh";
    track(reveal(target, { ...native, threshold: 0.5 }));
    expect(observers.observerOf(target)!.thresholds).toEqual([0, 0.5]);
    showPart(target, 0.3);
    await settle();
    expect(animation().playState).toBe("paused");
    await enter();
  });
  it.each([
    [2000, true],
    [1000, false],
  ])(
    "uses its own viewport in a cross-origin frame with no root bounds: height %d plays %s",
    async (height, plays) => {
      const report = interceptObserver();
      track(reveal(target, { ...native, threshold: 0.5 }));
      await settle();
      expect(innerHeight / height < 0.5).toBe(plays);
      report(entry(0.1, { width: 500, height }, null));
      await settle();
      expect(animation().playState).toBe(plays ? "running" : "paused");
    },
  );
  it("cancels the entrance when focus enters the element, and stops observing", () => {
    const observers = trackObservers();
    const play = vi.spyOn(Animation.prototype, "play");
    const link = target.appendChild(document.createElement("a"));
    link.tabIndex = -1;
    track(reveal(target, { ...native, threshold: 0.5 }));
    const entrance = animation();
    link.focus();
    expect(entrance.playState).toBe("idle");
    expect(target.getAnimations()).toEqual([]);
    expect(play).not.toHaveBeenCalled();
    expect(observers.observerOf(target)).toBeUndefined();
  });
  // The synthetic event gives focusin with no real focus, as when focus leaves before the reveal.
  it("plays the entrance when focus leaves before the reveal", () => {
    track(reveal(target, native));
    target.dispatchEvent(new FocusEvent("focusin"));
    expect(animation().playState).toBe("running");
  });
  it.each([
    [0.3, 0],
    [0.6, 0],
  ])("reads each entry of one report: %d, then %d", async (...ratios) => {
    const observers = trackObservers();
    const play = vi.spyOn(Animation.prototype, "play");
    const report = interceptObserver();
    track(reveal(target, { ...native, threshold: 0.5 }));
    await settle();
    report(...ratios.map((ratio) => entry(ratio)));
    expect(play).toHaveBeenCalledOnce();
    expect(animation().playState).toBe("running");
    expect(observers.observerOf(target)).toBeUndefined();
  });
  it.each(["selector", "iterable", "array-like", "live collection"])(
    "resolves multiple %s targets independently",
    async (kind) => {
      const stage = createStage();
      stage.innerHTML = `<div style="height: 150vh"></div><div style="height: 150vh"></div>`;
      const [a, b] = stage.children as unknown as [HTMLElement, HTMLElement];
      const targets =
        kind === "selector"
          ? "#stage > div"
          : kind === "iterable"
            ? new Set([a, b])
            : kind === "array-like"
              ? { 0: a, 1: b, length: 2 }
              : stage.children;
      track(reveal(targets, { duration: 60_000 }));
      await enter(a);
      expect(animation(b).playState).toBe("paused");
      await enter(b);
    },
  );
  it("ignores queued reports after disposal and permits repeated disposal", async () => {
    const observers = trackObservers();
    const cancel = vi.spyOn(Animation.prototype, "cancel");
    const report = interceptObserver();
    const handle = track(reveal(target, native));
    const entrance = animation();
    await settle();
    handle.dispose();
    handle.dispose();
    report(entry(1));
    expect(cancel).toHaveBeenCalledOnce();
    expect(entrance.playState).toBe("idle");
    expect(target.getAnimations()).toEqual([]);
    expect(observers.observerOf(target)).toBeUndefined();
  });
  it("exposes pending content when the motion preference changes", async () => {
    const observers = trackObservers();
    track(reveal(target, native));
    const entrance = animation();
    expect(opacity()).toBe("0");
    await setReducedMotion("reduce");
    expect(entrance.playState).toBe("idle");
    expect(opacity()).toBe("1");
    expect(observers.live()).toEqual([]);
  });
  it("fails safe and reports when native animation creation throws", async () => {
    const error = new TypeError(`core animate failed ${++run}`);
    trackAnimations().rejectEasing("bogus", error);
    const reports = collectReports();
    expect(() =>
      track(reveal(target, { keyframes: [{ opacity: 0, easing: "bogus" }, { opacity: 1 }] })),
    ).not.toThrow();
    expect(opacity()).toBe("1");
    expect(target.getAnimations()).toEqual([]);
    expect(await reports()).toEqual([error]);
  });
  it("exposes content with no WAAPI or IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    track(reveal(target, native));
    expect(animation().playState).toBe("running");
    withoutAnimate();
    const other = document.body.appendChild(document.createElement("div"));
    expect(() => track(reveal(other))).not.toThrow();
    expect(opacity(other)).toBe("1");
  });
  it("accepts empty and duplicate targets", () => {
    const animate = trackAnimations();
    track(reveal(".absent"));
    track(reveal([target, target]));
    expect(animate.calls()).toHaveLength(1);
    expect(target.getAnimations()).toHaveLength(1);
  });
});

describe("cascade", () => {
  it("applies only direct children and starts the first without initial delay", async () => {
    const observers = trackObservers();
    target.children[0]!.innerHTML = "<b>nested</b>";
    target.prepend("text");
    target.append(document.createComment("comment"));
    track(cascade(target, { ...native, interval: 10_000 }));
    const children = Array.from(target.children) as HTMLElement[];
    expect(target.getAnimations()).toEqual([]);
    expect(children.map(opacity)).toEqual(["0", "0", "0"]);
    expect(children.map((c) => animation(c).effect!.getTiming().delay)).toEqual([
      0, 10_000, 20_000,
    ]);
    expect(target.querySelector("b")!.getAnimations()).toEqual([]);
    expect(observers.observerOf(target)).toBeDefined();
    expect(observers.observerOf(children[0]!)).toBeUndefined();
    scrollIntoView(target);
    await expect.poll(() => animation(children[0]).playState).toBe("running");
    expect(children.map((c) => animation(c).playState)).toEqual(["running", "running", "running"]);
    expect(animation(children[0]).effect!.getComputedTiming().progress).not.toBeNull();
    expect(animation(children[1]).effect!.getComputedTiming().progress).toBe(0);
  });
  it("delay moves the start of the whole sequence", () => {
    track(cascade(target, { ...native, delay: 100, interval: 50 }));
    expect(
      Array.from(target.children, (c) => animation(c as HTMLElement).effect!.getTiming().delay),
    ).toEqual([100, 150, 200]);
  });
  it("multiple containers remain independent and disposal cancels pending children", async () => {
    const other = document.createElement("ul");
    other.innerHTML = "<li>a</li><li>b</li>";
    document.body.append(other);
    const observers = trackObservers();
    const handle = track(cascade([target, other], { ...native, interval: 10_000 }));
    expect(
      Array.from(other.children, (c) => animation(c as HTMLElement).effect!.getTiming().delay),
    ).toEqual([0, 10_000]);
    scrollIntoView(target);
    await expect.poll(() => animation(target.children[0] as HTMLElement).playState).toBe("running");
    expect(animation(other.children[0] as HTMLElement).playState).toBe("paused");
    expect(observers.observerOf(target)).toBeUndefined();
    expect(observers.observerOf(other)).toBeDefined();
    await enter(other.children[0] as HTMLElement);
    expect(observers.observerOf(other)).toBeUndefined();
    handle.dispose();
    handle.dispose();
    expect(target.getAnimations({ subtree: true })).toEqual([]);
    expect(other.getAnimations({ subtree: true })).toEqual([]);
    expect(Array.from(target.children).map((c) => getComputedStyle(c).opacity)).toEqual([
      "1",
      "1",
      "1",
    ]);
  });
  it("print shows the waiting children", () => {
    track(cascade(target, { ...native, interval: 10_000 }));
    dispatchEvent(new Event("beforeprint"));
    expect(Array.from(target.children).map((c) => getComputedStyle(c).opacity)).toEqual([
      "1",
      "1",
      "1",
    ]);
    dispatchEvent(new Event("afterprint"));
    expect(Array.from(target.children).map((c) => getComputedStyle(c).opacity)).toEqual([
      "0",
      "0",
      "0",
    ]);
  });
  it("print shows the children in their delay, and they keep the delay after the print", async () => {
    track(cascade(target, { ...native, interval: 60_000 }));
    const child = target.children[1] as HTMLElement;
    scrollIntoView(target);
    await expect.poll(() => animation(child).playState).toBe("running");
    const time = animation(child).currentTime as number;
    dispatchEvent(new Event("beforeprint"));
    expect(opacity(child)).toBe("1");
    dispatchEvent(new Event("afterprint"));
    expect(opacity(child)).toBe("0");
    expect(animation(child).playState).toBe("running");
    expect(animation(child).currentTime as number).toBeGreaterThanOrEqual(time);
    expect(animation(child).currentTime as number).toBeLessThan(60_000);
    animation(child).currentTime = 90_000;
    expect(Number(opacity(child))).toBeGreaterThan(0);
    expect(Number(opacity(child))).toBeLessThan(1);
  });
  it("accepts an empty container", async () => {
    const animate = trackAnimations();
    target.innerHTML = "";
    const handle = track(cascade(target));
    scrollIntoView(target);
    await settle();
    handle.dispose();
    expect(animate.calls()).toEqual([]);
  });
  it("reduced motion bypasses every child delay", async () => {
    const observers = trackObservers();
    await setReducedMotion("reduce");
    track(cascade(target, { ...native, interval: 10_000 }));
    expect(observers.live()).toHaveLength(0);
    expect(target.getAnimations({ subtree: true })).toEqual([]);
    expect(Array.from(target.children).map((c) => getComputedStyle(c).opacity)).toEqual([
      "1",
      "1",
      "1",
    ]);
  });
});

describe("release without dispose", () => {
  const all = ["beforeprint", "afterprint", "change"];
  let listening: () => string[];
  beforeEach(() => {
    const types = (spy: { mock: { calls: unknown[][] } }) =>
      spy.mock.calls.map(([type]) => type as string).filter((type) => all.includes(type));
    const listen = [
      vi.spyOn(window, "addEventListener"),
      vi.spyOn(MediaQueryList.prototype, "addEventListener"),
    ];
    const unlisten = [
      vi.spyOn(window, "removeEventListener"),
      vi.spyOn(MediaQueryList.prototype, "removeEventListener"),
    ];
    listening = () => {
      const added = listen.flatMap(types);
      for (const type of unlisten.flatMap(types)) {
        const index = added.indexOf(type);
        if (index >= 0) added.splice(index, 1);
      }
      return added;
    };
  });
  async function expectListening(types: string[]) {
    await settle();
    expect(listening()).toEqual(types);
  }
  const released = () => expect.poll(listening).toEqual([]);

  it("releases a finished reveal", async () => {
    track(reveal(target, native));
    await expectListening(all);
    await enter();
    await expectListening(all);
    animation().finish();
    await released();
  });
  it("releases a cascade when every child finished", async () => {
    target.innerHTML = "<p></p><p></p>";
    track(cascade(target, native));
    const [first, second] = Array.from(target.children, (c) => animation(c as HTMLElement));
    await enter(target.firstElementChild as HTMLElement);
    first!.finish();
    await expectListening(all);
    second!.finish();
    await released();
  });
  it("releases an empty cascade at once", async () => {
    target.innerHTML = "";
    track(cascade(target));
    await released();
  });
  it("releases an entrance that page code cancels", async () => {
    track(reveal(target, native));
    animation().cancel();
    await released();
  });
  it("releases an element that has focus before the reveal starts", async () => {
    target.innerHTML = `<a href="#">a</a>`;
    target.querySelector("a")!.focus();
    track(reveal(target, native));
    await released();
  });
  it("stays safe to dispose after the finish", async () => {
    const handle = track(reveal(target, native));
    await enter();
    const entrance = animation();
    entrance.finish();
    await released();
    expect(() => {
      handle.dispose();
      handle.dispose();
    }).not.toThrow();
    expect(entrance.playState).toBe("finished");
  });
  it("keeps the print listeners for a waiting reveal when another call is disposed", async () => {
    const [disposed, waiting] = Array.from(target.children);
    reveal(disposed!).dispose();
    const handle = track(reveal(waiting!));
    await expectListening(all);
    handle.dispose();
    await released();
  });
  it("releases each finished target while another target of the call waits", async () => {
    const observers = trackObservers();
    const [finished, waiting] = Array.from(target.children) as HTMLElement[];
    track(reveal([finished!, waiting!], native));
    animation(finished).finish();
    await expect.poll(() => observers.observerOf(finished!)).toBeUndefined();
    expect(observers.observerOf(waiting!)).toBeDefined();
  });
});
