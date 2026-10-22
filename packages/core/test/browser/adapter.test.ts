import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCascade, createReveal, type RevealStore } from "../../src/adapter";
import { collectReports } from "@awesome-reveal/test-utils/reports";
import {
  mountBelowTheFold,
  scrollIntoView,
  scrollToTop,
  settle,
} from "@awesome-reveal/test-utils/layout";
import {
  interceptObserver,
  trackAnimations,
  trackObservers,
  type AnimateCall,
} from "@awesome-reveal/test-utils/spies";

let target: HTMLElement;
let stores: RevealStore[];
const keep = <Store extends RevealStore>(store: Store) => {
  stores.push(store);
  return store;
};
const opacity = (element: Element = target) => getComputedStyle(element).opacity;
const animation = (element: Element = target) => element.getAnimations()[0]!;
const native = { keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: 60_000 };
let run = 0;
const paragraphs = () => Array.from(target.children) as [HTMLElement, HTMLElement, HTMLElement];

beforeEach(() => {
  target = mountBelowTheFold();
  stores = [];
});
afterEach(() => {
  for (const store of stores) store.attach(null);
  document.body.innerHTML = "";
});
async function enter(state: RevealStore) {
  scrollIntoView(target);
  await expect.poll(() => state.revealed).toBe(true);
}

describe("createReveal", () => {
  const options = { duration: 60_000 };

  // The server renders the element hidden, so the entrance of `when: true` plays after hydration.
  it("is hidden before the first attach, also with when: true", () => {
    expect(createReveal(options).revealed).toBe(false);
    expect(createReveal({ ...options, when: null }).revealed).toBe(false);
    expect(createReveal({ ...options, when: true }).revealed).toBe(false);
  });

  it("tells the listener, but observes and plays nothing, before it has an element", () => {
    const observers = trackObservers();
    const animate = trackAnimations();
    const state = createReveal({ ...options, when: false });
    const listener = vi.fn();
    state.subscribe(listener);
    state.setOptions({ ...options, when: true });
    expect(listener.mock.calls).toEqual([[true]]);
    expect(observers.live()).toEqual([]);
    expect(animate.calls()).toEqual([]);
  });

  it("reveals at the first attach with when: true", () => {
    const animate = trackAnimations();
    const state = keep(createReveal({ ...options, when: true }));
    const listener = vi.fn();
    state.subscribe(listener);
    state.attach(target);
    expect(listener.mock.calls).toEqual([[true]]);
    expect(animate.calls()).toHaveLength(1);
    expect(animation().playState).toBe("running");
  });

  it("marks the attached element, and unmarks it at the detach", () => {
    const [first, second] = paragraphs();
    const state = keep(createReveal(options));
    state.attach(first);
    expect(first.getAttribute("data-awesome-reveal-attached")).toBe("");
    state.attach(second);
    expect(first.hasAttribute("data-awesome-reveal-attached")).toBe(false);
    expect(second.getAttribute("data-awesome-reveal-attached")).toBe("");
    state.attach(null);
    expect(second.hasAttribute("data-awesome-reveal-attached")).toBe(false);
  });

  it("calls onReveal once for each reveal, also when the same element plays again", async () => {
    const animate = trackAnimations();
    const onReveal = vi.fn();
    const state = keep(createReveal({ ...options, onReveal }));
    state.attach(target);
    await enter(state);
    state.attach(null);
    state.attach(target);
    expect(animate.calls()).toHaveLength(2);
    expect(onReveal).toHaveBeenCalledOnce();
    expect(onReveal.mock.calls[0]![0]).toBe(target);
    state.setOptions({ ...options, onReveal, when: false });
    state.setOptions({ ...options, onReveal, when: true });
    expect(onReveal).toHaveBeenCalledTimes(2);
  });

  it("tells the listener, removes the hidden attribute, plays and calls onReveal when the element enters the viewport", async () => {
    target.setAttribute("data-awesome-reveal", "hidden");
    const hidden = () => target.hasAttribute("data-awesome-reveal");
    const realAnimate = Element.prototype.animate;
    let hiddenAtPlay: boolean | undefined;
    const animate = vi.spyOn(Element.prototype, "animate").mockImplementation(function (
      this: Element,
      ...args
    ) {
      hiddenAtPlay = hidden();
      return realAnimate.apply(this, args);
    });
    const listener = vi.fn<(revealed: boolean) => boolean>(() => hidden());
    const onReveal = vi.fn(() => hidden());
    const state = keep(createReveal({ ...options, onReveal }));
    state.subscribe(listener);
    state.attach(target);
    await enter(state);
    expect(listener.mock.calls).toEqual([[true]]);
    expect(listener.mock.results[0]!.value).toBe(true);
    expect(hiddenAtPlay).toBe(false);
    expect(onReveal.mock.results[0]!.value).toBe(false);
    const [listened] = listener.mock.invocationCallOrder;
    const [played] = animate.mock.invocationCallOrder;
    const [revealed] = onReveal.mock.invocationCallOrder;
    expect(listened).toBeLessThan(played!);
    expect(played).toBeLessThan(revealed!);
    expect(state.revealed).toBe(true);
  });

  it("cancels the animation before it tells the listener to hide the element", async () => {
    const cancel = vi.spyOn(Animation.prototype, "cancel");
    const state = keep(createReveal(options));
    state.attach(target);
    await enter(state);
    const entrance = animation();
    const listener = vi.fn();
    state.subscribe(listener);
    state.setOptions({ ...options, when: false });
    expect(entrance.playState).toBe("idle");
    expect(cancel).toHaveBeenCalledOnce();
    expect(listener.mock.calls).toEqual([[false]]);
    expect(cancel.mock.invocationCallOrder[0]).toBeLessThan(listener.mock.invocationCallOrder[0]!);
  });

  it("plays the entrance again when the same element comes back right after null", () => {
    const animate = trackAnimations();
    const state = keep(createReveal({ ...options, when: true }));
    state.attach(target);
    state.attach(null);
    state.attach(target);
    expect(animate.calls().map((call) => call.animation.playState)).toEqual(["idle", "running"]);
  });

  it("does not replay a finished entrance when the same element comes back after null", () => {
    const animate = trackAnimations();
    const state = keep(createReveal({ ...options, when: true }));
    state.attach(target);
    animation().finish();
    state.attach(null);
    state.attach(target);
    expect(animate.calls()).toHaveLength(1);
    expect(target.getAnimations()).toEqual([]);
  });

  it("cancels the entrance when a new element replaces the element", () => {
    const [first, second] = paragraphs();
    const state = keep(createReveal({ ...options, when: true }));
    state.attach(first);
    const entrance = animation(first);
    state.attach(second);
    expect(entrance.playState).toBe("idle");
    expect(first.getAnimations()).toEqual([]);
  });

  it("plays no entrance on a different element after null", () => {
    const animate = trackAnimations();
    const [first, second] = paragraphs();
    const state = keep(createReveal({ ...options, when: true }));
    state.attach(first);
    state.attach(null);
    state.attach(second);
    expect(animate.calls().filter((call) => call.element === second)).toEqual([]);
    expect(second.getAnimations()).toEqual([]);
  });

  it("does not reveal a stale in-view report when `when` is removed", async () => {
    const state = keep(createReveal(options));
    state.attach(target);
    await enter(state);
    state.setOptions({ ...options, when: false });
    expect(state.revealed).toBe(false);
    scrollToTop();
    state.setOptions(options);
    expect(state.revealed).toBe(false);
    await settle();
    expect(state.revealed).toBe(false);
  });

  it("plays the entrance once when when is true from the start", () => {
    const observers = trackObservers();
    const animate = trackAnimations();
    const [first, second] = paragraphs();
    const state = keep(createReveal({ ...options, when: true }));
    state.attach(first);
    expect(animation(first).playState).toBe("running");
    state.attach(second);
    expect(animate.calls().filter((call) => call.element === second)).toEqual([]);
    expect(second.getAnimations()).toEqual([]);
    expect(observers.live()).toEqual([]);
  });

  it("keeps a revealed state on a new element, and observes a hidden one", async () => {
    const observers = trackObservers();
    const animate = trackAnimations();
    const [first, second, third] = paragraphs();
    const state = keep(createReveal(options));
    state.attach(first);
    state.attach(second);
    expect(observers.live()).toHaveLength(1);
    expect(observers.observerOf(first)).toBeUndefined();
    expect(observers.observerOf(second)).toBe(observers.live()[0]);
    await enter(state);
    state.attach(third);
    expect(animate.calls().filter((call) => call.element === third)).toEqual([]);
    expect(third.getAnimations()).toEqual([]);
    expect(state.revealed).toBe(true);
    expect(observers.live()).toEqual([]);
  });

  it("observes the next element after when changes from true to null with no element", () => {
    const observers = trackObservers();
    const animate = trackAnimations();
    const [first, second] = paragraphs();
    const state = keep(createReveal(options));
    state.attach(first);
    state.attach(null);
    state.setOptions({ ...options, when: true });
    state.setOptions({ ...options, when: null });
    state.attach(second);
    expect(state.revealed).toBe(false);
    expect(animate.calls()).toEqual([]);
    expect(observers.observerOf(second)).toBe(observers.live()[0]);
  });

  it("cancels the animation and stops observing when it gets null", async () => {
    const observers = trackObservers();
    const state = keep(createReveal(options));
    state.attach(target);
    await enter(state);
    const entrance = animation();
    expect(entrance.playState).toBe("running");
    state.attach(null);
    expect(entrance.playState).toBe("idle");
    expect(observers.live()).toEqual([]);
  });

  it("ignores a queued report after the detach", () => {
    const report = interceptObserver();
    const listener = vi.fn();
    const state = keep(createReveal(options));
    state.subscribe(listener);
    state.attach(target);
    state.attach(null);
    report({
      target,
      isIntersecting: true,
      intersectionRatio: 1,
    } as unknown as IntersectionObserverEntry);
    expect(state.revealed).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it("restarts the observer only for when and threshold", () => {
    const observers = trackObservers();
    const state = keep(createReveal({ ...options, threshold: 0.5 }));
    state.attach(target);
    const [first] = observers.live();
    state.setOptions({ ...options, threshold: 0.5, duration: 100 });
    state.setOptions({
      ...options,
      threshold: 0.5,
      duration: 100,
      when: null,
    } as never);
    expect(observers.live()).toHaveLength(1);
    expect(observers.live()[0]).toBe(first);
    state.setOptions({ ...options, threshold: 0.2 });
    expect(observers.live()).toHaveLength(1);
    expect(observers.live()[0]).not.toBe(first);
  });

  it("calls only the last listener, and a removed listener not at all", () => {
    const state: RevealStore = createReveal({ ...options, when: false });
    const first = vi.fn();
    const second = vi.fn();
    state.subscribe(first);
    const remove = state.subscribe(second);
    state.setOptions({ ...options, when: true });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(true);
    remove();
    state.setOptions({ ...options, when: false });
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("copies the options, so that a mutated object still restarts the observer", () => {
    const observers = trackObservers();
    const mutable = { ...options, threshold: 1 };
    const state = keep(createReveal(mutable));
    state.attach(target);
    const [first] = observers.live();
    mutable.threshold = 0.4;
    state.setOptions(mutable);
    expect(observers.live()).toHaveLength(1);
    expect(observers.live()[0]).not.toBe(first);
  });
});

it("reports a throwing adapter callback once without breaking the reveal", async () => {
  const reports = collectReports();
  const error = new Error(`callback failure ${++run}`);
  const onReveal = () => {
    throw error;
  };
  const state = keep(createReveal({ onReveal, duration: 60_000 }));
  state.attach(target);
  await enter(state);
  state.setOptions({ onReveal, when: false });
  state.setOptions({ onReveal, when: true });
  expect(state.revealed).toBe(true);
  expect(await reports()).toEqual([error]);
});

describe("createCascade", () => {
  const delays = (calls: AnimateCall[]) => calls.map((call) => call.options.delay);

  it("animates the direct children at the reveal, interval milliseconds apart", async () => {
    const animate = trackAnimations();
    const state = keep(createCascade({ duration: 60_000 }));
    state.attach(target);
    expect(animate.calls()).toEqual([]);
    await enter(state);
    expect(
      animate.calls().map((call) => paragraphs().indexOf(call.element as HTMLElement)),
    ).toEqual([0, 1, 2]);
    expect(delays(animate.calls())).toEqual([0, 80, 160]);
  });

  it("reads the children at the reveal, so children rendered after the attach play", async () => {
    const animate = trackAnimations();
    target.innerHTML = "";
    const state = keep(createCascade({ interval: 50, duration: 60_000 }));
    state.attach(target);
    target.innerHTML = "<p>a</p><p>b</p>";
    await enter(state);
    const children = Array.from(target.children);
    expect(animate.calls().map((call) => children.indexOf(call.element))).toEqual([0, 1]);
    expect(delays(animate.calls())).toEqual([0, 50]);
  });

  it("applies a new interval at the next reveal, and cancels every child when it hides", () => {
    const animate = trackAnimations();
    target.innerHTML = "<p>a</p><p>b</p>";
    const [, second] = target.children;
    const state = keep(createCascade({ when: true }));
    state.attach(target);
    state.setOptions({ when: false, interval: 200 });
    expect(animate.calls().map((call) => call.animation.playState)).toEqual(["idle", "idle"]);
    state.setOptions({ when: true, interval: 200 });
    expect(delays(animate.calls().filter((call) => call.element === second))).toEqual([80, 200]);
  });

  it("reveals a container with no children and calls onReveal with the container", () => {
    target.innerHTML = "";
    const onReveal = vi.fn();
    const state = keep(createCascade({ when: true, onReveal }));
    state.attach(target);
    expect(state.revealed).toBe(true);
    expect(onReveal).toHaveBeenCalledOnce();
    expect(onReveal.mock.calls[0]![0]).toBe(target);
  });
});

describe("adapter store", () => {
  it("a hide during the delay resets the element, and no entrance plays later", async () => {
    const options = { ...native, delay: 60_000 };
    const state = keep(createReveal({ ...options, when: true }));
    state.attach(target);
    const entrance = animation();
    entrance.currentTime = 30_000;
    expect(entrance.playState).toBe("running");
    expect(opacity()).toBe("0");
    state.setOptions({ ...options, when: false });
    expect(entrance.playState).toBe("idle");
    expect(opacity()).toBe("1");
    await settle();
    expect(target.getAnimations()).toEqual([]);
  });

  describe("a settled entrance", () => {
    const print = ["beforeprint", "afterprint"];
    let listening: () => string[];
    beforeEach(() => {
      const types = (spy: { mock: { calls: unknown[][] } }) =>
        spy.mock.calls.map(([type]) => type as string).filter((type) => print.includes(type));
      const listen = vi.spyOn(window, "addEventListener");
      const unlisten = vi.spyOn(window, "removeEventListener");
      listening = () => {
        const added = types(listen);
        for (const type of types(unlisten)) {
          const index = added.indexOf(type);
          if (index >= 0) added.splice(index, 1);
        }
        return added;
      };
    });

    it("releases the print listeners of a cascade when every child finished", async () => {
      const state = keep(createCascade({ ...native, when: true }));
      state.attach(target);
      const [first, second, third] = paragraphs().map((child) => animation(child));
      first!.finish();
      second!.finish();
      await settle();
      expect(listening()).toEqual(print);
      third!.finish();
      await expect.poll(listening).toEqual([]);
    });

    it("does not replay after null, and a hide fires no cancel event", async () => {
      const animate = trackAnimations();
      const state = keep(createReveal({ ...native, when: true }));
      state.attach(target);
      const entrance = animation();
      const cancelled = vi.fn();
      entrance.addEventListener("cancel", cancelled);
      entrance.finish();
      await expect.poll(listening).toEqual([]);
      state.attach(null);
      state.attach(target);
      expect(animate.calls()).toHaveLength(1);
      state.setOptions({ ...native, when: false });
      await settle();
      expect(cancelled).not.toHaveBeenCalled();
      expect(entrance.playState).toBe("finished");
    });
  });
});
