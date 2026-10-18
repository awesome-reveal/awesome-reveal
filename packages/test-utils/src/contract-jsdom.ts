import type { CascadeOptions } from "@awesome-reveal/core/adapter";

import { animations, runningAnimations } from "./animate";
import { easing } from "./entrance-fixtures";
import { intersect as report, MockIntersectionObserver, observerOf } from "./intersection-observer";
import { collectWindowErrors } from "./reports";

export type ContractOptions = CascadeOptions;

export interface MountInit {
  style?: Partial<CSSStyleDeclaration>;
}

export interface Mounted {
  element(): HTMLElement;
  rerender(options: ContractOptions): Promise<void>;
  unmount(): Promise<void>;
  flush(): Promise<void>;
  /** Wraps a report of the mock observer in the update scope of the framework. */
  run(fn: () => void): Promise<void>;
  /** Renders a new element for the same reveal, such as a new `as` tag, with these options. */
  replaceNode?(options?: ContractOptions): Promise<void>;
}

export interface Harness {
  /** Renders an element with `data-contract` and three element children. */
  mount(options: ContractOptions, init?: MountInit): Promise<Mounted>;
  /** Set to `true` when the framework can render a new element for the same reveal. */
  replacesNode?: boolean;
  /** Set to `true` when the reveal belongs to its element, so a new element starts a new reveal. */
  boundToElement?: boolean;
}

const hidden = (element: HTMLElement) => element.getAttribute("data-awesome-reveal") === "hidden";

const shown = (element: HTMLElement) => !element.hasAttribute("data-awesome-reveal");

// `:focus-within` needs real focus, so the scenarios focus a child and do not dispatch `focusin`.
const focusChild = (m: Mounted, index = 0) => {
  const child = Array.from(m.element().children).at(index) as HTMLElement;
  child.tabIndex = -1;
  return m.run(() => child.focus());
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

// Reports throw from a microtask. The wrapper keeps the microtasks of the framework running.
function collectReports() {
  const errors: unknown[] = [];
  const original = globalThis.queueMicrotask;
  vi.stubGlobal("queueMicrotask", (callback: VoidFunction) =>
    original(() => {
      try {
        callback();
      } catch (error) {
        errors.push(error);
      }
    }),
  );
  return errors;
}

export function describeContract(name: string, harness: Harness) {
  describe(`reveal contract: ${name}`, () => {
    let current: Mounted | undefined;

    async function mount(options: ContractOptions = {}, init?: MountInit) {
      current = await harness.mount(options, init);
      return current;
    }

    const rerender = (m: Mounted, options: ContractOptions) => m.rerender(options);

    async function intersect(m: Mounted, visible: boolean | number) {
      await m.run(() => report(m.element(), visible));
    }

    afterEach(async () => {
      await current?.unmount();
      current = undefined;
      document.body.innerHTML = "";
    });

    it("hides the element at the start", async () => {
      const m = await mount();
      expect(hidden(m.element())).toBe(true);
      expect(animations).toHaveLength(0);
      expect(observerOf(m.element())).toBeDefined();
    });

    it("reveals once on intersect", async () => {
      const m = await mount();
      await intersect(m, true);
      expect(shown(m.element())).toBe(true);
      expect(animations.map((a) => a.element)).toEqual([m.element()]);
      expect(observerOf(m.element())).toBeUndefined();
    });

    it("when: true shows and plays with no observer", async () => {
      const m = await mount({ when: true });
      expect(shown(m.element())).toBe(true);
      expect(animations).toHaveLength(1);
      expect(MockIntersectionObserver.instances.size).toBe(0);
    });

    it("when: false stays hidden with no observer", async () => {
      const m = await mount({ when: false });
      expect(hidden(m.element())).toBe(true);
      expect(MockIntersectionObserver.instances.size).toBe(0);
    });

    it("when: undefined observes", async () => {
      const m = await mount({ when: undefined });
      expect(observerOf(m.element())).toBeDefined();
    });

    it("when: null observes", async () => {
      const m = await mount({ when: null });
      expect(observerOf(m.element())).toBeDefined();
      await intersect(m, true);
      expect(shown(m.element())).toBe(true);
    });

    it("a toggle of when replays", async () => {
      const m = await mount({ when: false });
      await rerender(m, { when: true });
      expect(shown(m.element())).toBe(true);
      await rerender(m, { when: false });
      expect(hidden(m.element())).toBe(true);
      expect(runningAnimations()).toHaveLength(0);
      await rerender(m, { when: true });
      expect(animations).toHaveLength(2);
      expect(runningAnimations()).toHaveLength(1);
    });

    it("a change of threshold restarts the observer", async () => {
      const m = await mount({ threshold: 0.5 });
      const before = observerOf(m.element());
      await rerender(m, { threshold: 0.2 });
      const after = observerOf(m.element());
      expect(after).toBeDefined();
      expect(after).not.toBe(before);
      expect(MockIntersectionObserver.instances.size).toBe(1);
    });

    it("reveals when the element leaves before it reaches the threshold", async () => {
      const m = await mount({ threshold: 0.5 });
      await intersect(m, 0.2);
      expect(hidden(m.element())).toBe(true);
      await intersect(m, false);
      expect(shown(m.element())).toBe(true);
      expect(runningAnimations()).toHaveLength(1);
    });

    it("the other options apply at the next reveal", async () => {
      const m = await mount({ duration: 300 });
      const before = observerOf(m.element());
      await rerender(m, { duration: 400 });
      expect(observerOf(m.element())).toBe(before);
      await intersect(m, true);
      await rerender(m, { duration: 500 });
      expect(animations).toHaveLength(1);
      expect(animations[0]!.options).toMatchObject({ duration: 400 });
      await rerender(m, { when: false, duration: 500 });
      await rerender(m, { when: true, duration: 500 });
      expect(animations[1]!.options).toMatchObject({ duration: 500 });
    });

    it("passes delay to core, and not to the element", async () => {
      const m = await mount({ delay: 150, when: true });
      expect(animations[0]!.options).toMatchObject({ delay: 150 });
      expect(m.element().hasAttribute("delay")).toBe(false);
    });

    it("a hide during the delay cancels the entrance and hides the element", async () => {
      const m = await mount({ delay: 60_000, when: true });
      expect(animations[0]!.options).toMatchObject({ delay: 60_000 });
      await rerender(m, { delay: 60_000, when: false });
      expect(hidden(m.element())).toBe(true);
      expect(animations).toHaveLength(1);
      expect(runningAnimations()).toHaveLength(0);
    });

    it("print shows the element in its delay until the print ends", async () => {
      const m = await mount({ delay: 60_000, when: true });
      const [animation] = animations;
      const fill = () => animation!.effect.updateTiming.mock.lastCall?.[0].fill;
      dispatchEvent(new Event("beforeprint"));
      expect(fill()).toBe("none");
      dispatchEvent(new Event("afterprint"));
      expect(fill()).toBe("backwards");
      expect(animation!.playState).toBe("running");
      expect(shown(m.element())).toBe(true);
    });

    it("reduced motion shows the element with no animation, also with a delay", async () => {
      vi.stubGlobal("matchMedia", () => ({ matches: true }));
      const m = await mount({ delay: 60_000 });
      await intersect(m, true);
      expect(shown(m.element())).toBe(true);
      expect(animations).toHaveLength(0);
    });

    it("switching to reduced motion cancels the entrance and exposes content", async () => {
      const media = new EventTarget() as EventTarget & { matches: boolean };
      media.matches = false;
      vi.stubGlobal("matchMedia", () => media);
      const m = await mount({ when: false });
      media.matches = true;
      await m.run(() => media.dispatchEvent(new Event("change")));
      expect(shown(m.element())).toBe(true);
      expect(runningAnimations()).toHaveLength(0);
      expect(observerOf(m.element())).toBeUndefined();
    });

    it("the reveal keeps the inline style of the user", async () => {
      const m = await mount({}, { style: { opacity: "0.5", color: "red" } });
      expect(m.element().style.opacity).toBe("0.5");
      await intersect(m, true);
      expect(m.element().style.opacity).toBe("0.5");
      expect(m.element().style.color).toBe("red");
    });

    it("unmount cancels the animation and the observer", async () => {
      const m = await mount();
      await intersect(m, true);
      await m.unmount();
      await m.flush();
      expect(runningAnimations()).toHaveLength(0);
      expect(MockIntersectionObserver.instances.size).toBe(0);
    });

    if (harness.replacesNode) {
      it(
        harness.boundToElement
          ? "a new element after the reveal starts a new reveal"
          : "a new element after the reveal does not replay",
        async () => {
          const m = await mount();
          await intersect(m, true);
          const old = m.element();
          await m.replaceNode?.();
          expect(m.element()).not.toBe(old);
          if (harness.boundToElement) {
            expect(hidden(m.element())).toBe(true);
            expect(observerOf(m.element())).toBeDefined();
          } else {
            expect(shown(m.element())).toBe(true);
            expect(animations).toHaveLength(1);
            expect(MockIntersectionObserver.instances.size).toBe(0);
          }
        },
      );

      it("a new element before the reveal is observed", async () => {
        const m = await mount();
        await m.replaceNode?.();
        expect(hidden(m.element())).toBe(true);
        expect(observerOf(m.element())).toBeDefined();
        expect(MockIntersectionObserver.instances.size).toBe(1);
      });

      it("a new element and `when: true` in one update play on the new element", async () => {
        const m = await mount({ when: false });
        await m.replaceNode?.({ when: true });
        expect(shown(m.element())).toBe(true);
        expect(animations.map((a) => a.element)).toEqual([m.element()]);
        expect(runningAnimations()).toHaveLength(1);
      });
    }

    it("onReveal is called with the element at each reveal", async () => {
      const onReveal = vi.fn();
      const m = await mount({ onReveal });
      expect(onReveal).not.toHaveBeenCalled();
      await intersect(m, true);
      expect(onReveal.mock.calls).toEqual([[m.element()]]);
      await rerender(m, { when: false, onReveal });
      await rerender(m, { when: true, onReveal });
      expect(onReveal).toHaveBeenCalledTimes(2);
    });

    it("onReveal sees the element without the hidden attribute", async () => {
      const attributes: (string | null)[] = [];
      const onReveal = (element: Element) =>
        attributes.push(element.getAttribute("data-awesome-reveal"));
      const m = await mount({ onReveal });
      await intersect(m, true);
      await rerender(m, { when: false, onReveal });
      expect(hidden(m.element())).toBe(true);
      await rerender(m, { when: true, onReveal });
      expect(attributes).toEqual([null, null]);
    });

    it("direction builds the entrance", async () => {
      const m = await mount({ from: "left" });
      await intersect(m, true);
      const [, move] = animations[0]!.keyframes as Keyframe[];
      expect(move).toMatchObject({ translate: "-24px 0px" });
      expect(move!.easing).toBe(easing);
    });

    it("marks the element as attached until it unmounts", async () => {
      const m = await mount();
      const element = m.element();
      expect(element.hasAttribute("data-awesome-reveal-attached")).toBe(true);
      await intersect(m, true);
      expect(element.hasAttribute("data-awesome-reveal-attached")).toBe(true);
      await m.unmount();
      await m.flush();
      expect(element.hasAttribute("data-awesome-reveal-attached")).toBe(false);
    });

    it("focus in the element reveals it at once with no entrance, also below the threshold", async () => {
      const onReveal = vi.fn();
      const m = await mount({ threshold: 0.5, delay: 2000, onReveal });
      await focusChild(m);
      expect(shown(m.element())).toBe(true);
      expect(observerOf(m.element())).toBeUndefined();
      expect(animations).toHaveLength(0);
      expect(onReveal.mock.calls).toEqual([[m.element()]]);
    });

    it("a reveal of an element that contains focus plays no entrance", async () => {
      const onReveal = vi.fn();
      const m = await mount({ when: false, onReveal });
      await focusChild(m);
      expect(hidden(m.element())).toBe(true);
      await rerender(m, { when: true, onReveal });
      expect(shown(m.element())).toBe(true);
      expect(animations).toHaveLength(0);
      expect(onReveal).toHaveBeenCalledOnce();
    });

    it("unmount stops listening to focus", async () => {
      const listen = vi.spyOn(HTMLElement.prototype, "addEventListener");
      const unlisten = vi.spyOn(HTMLElement.prototype, "removeEventListener");
      const m = await mount();
      const element = m.element();
      const focusListeners = (spy: typeof listen | typeof unlisten) =>
        new Set(
          spy.mock.calls
            .filter(([type], i) => type === "focusin" && spy.mock.contexts[i] === element)
            .map(([, listener]) => listener),
        );
      expect(focusListeners(listen).size).toBeGreaterThan(0);
      await m.unmount();
      await m.flush();
      expect(focusListeners(unlisten)).toEqual(focusListeners(listen));
    });

    it("focus does not reveal the element with when: false", async () => {
      const m = await mount({ when: false });
      await focusChild(m);
      expect(hidden(m.element())).toBe(true);
      expect(animations).toHaveLength(0);
    });

    it("a change from when: false to null with focus inside shows the element at once with no entrance", async () => {
      const onReveal = vi.fn();
      const m = await mount({ when: false, onReveal });
      await focusChild(m);
      await rerender(m, { when: null, onReveal });
      expect(shown(m.element())).toBe(true);
      expect(observerOf(m.element())).toBeUndefined();
      expect(animations).toHaveLength(0);
      expect(onReveal).toHaveBeenCalledOnce();
    });

    it("a change from when: true to false with focus inside resets the entrance and keeps the focus", async () => {
      const m = await mount({ when: true });
      await focusChild(m);
      await rerender(m, { when: false });
      expect(hidden(m.element())).toBe(true);
      expect(runningAnimations()).toHaveLength(0);
      expect(document.activeElement).toBe(m.element().children[0]);
    });

    it("reduced motion shows the element with when: false at mount", async () => {
      vi.stubGlobal("matchMedia", () => ({ matches: true }));
      const m = await mount({ when: false });
      expect(shown(m.element())).toBe(true);
      expect(animations).toHaveLength(0);
    });

    it("with no IntersectionObserver the element shows at once", async () => {
      vi.stubGlobal("IntersectionObserver", undefined);
      const m = await mount();
      await m.flush();
      expect(shown(m.element())).toBe(true);
      expect(animations).toHaveLength(1);
    });

    it("a throwing IntersectionObserver shows the element", async () => {
      // A test file can run more than one harness, and core reports each message only one time per module.
      const message = `Invalid threshold: ${name}`;
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          constructor() {
            throw new SyntaxError(message);
          }
        },
      );
      const stopWindowErrors = collectWindowErrors();
      const reports = collectReports();
      let thrown: unknown;
      let windowErrors: unknown[];
      try {
        await mount({ threshold: 2 }).catch((error) => (thrown = error));
        await settle();
      } finally {
        windowErrors = stopWindowErrors();
      }
      expect(thrown).toBeUndefined();
      expect(windowErrors).toEqual([]);
      expect(reports).toEqual([new SyntaxError(message)]);
      const element = document.querySelector<HTMLElement>("[data-contract]");
      expect(element && shown(element)).toBe(true);
    });

    it("invalid native keyframes leave the element visible, and report once", async () => {
      const message = `Invalid easing: ${name}`;
      const original = Element.prototype.animate;
      Element.prototype.animate = function (keyframes, options) {
        if (JSON.stringify(keyframes).includes('"bogus"')) throw new TypeError(message);
        return original.call(this, keyframes, options);
      };
      const keyframes = [{ opacity: 0, easing: "bogus" }, { opacity: 1 }];
      const reports = collectReports();
      const m = await mount({ keyframes });
      await intersect(m, true);
      await rerender(m, { when: false, keyframes });
      await rerender(m, { when: true, keyframes });
      await settle();
      expect(shown(m.element())).toBe(true);
      expect(reports).toEqual([new TypeError(message)]);
    });
  });
}

/** Runs the cascade scenarios. The harness renders the cascade container with three element children. */
export function describeCascadeContract(name: string, harness: Harness) {
  describe(`cascade contract: ${name}`, () => {
    let current: Mounted | undefined;

    async function mount(options: ContractOptions = {}) {
      current = await harness.mount(options);
      return current;
    }

    const children = (m: Mounted) => Array.from(m.element().children);
    const delays = () =>
      animations.map((animation) => (animation.options as KeyframeAnimationOptions).delay);

    afterEach(async () => {
      await current?.unmount();
      current = undefined;
      document.body.innerHTML = "";
    });

    it("hides the children with the container attribute and observes the container", async () => {
      const m = await mount();
      expect(m.element().getAttribute("data-awesome-reveal")).toBe("cascade");
      expect(animations).toHaveLength(0);
      expect(observerOf(m.element())).toBeDefined();
    });

    it("reveals the direct children in sequence on intersect", async () => {
      const m = await mount();
      await m.run(() => report(m.element(), true));
      expect(shown(m.element())).toBe(true);
      expect(animations.map((a) => a.element)).toEqual(children(m));
      expect(delays()).toEqual([0, 80, 160]);
      expect(observerOf(m.element())).toBeUndefined();
    });

    it("interval sets the delay between the children", async () => {
      await mount({ interval: 120, when: true });
      expect(delays()).toEqual([0, 120, 240]);
    });

    it("delay moves the start of the whole sequence", async () => {
      const m = await mount({ delay: 100, interval: 120, when: true });
      expect(delays()).toEqual([100, 220, 340]);
      expect(m.element().hasAttribute("delay")).toBe(false);
    });

    it("a toggle of when replays all the children", async () => {
      const m = await mount({ when: true });
      await m.rerender({ when: false });
      expect(m.element().getAttribute("data-awesome-reveal")).toBe("cascade");
      expect(runningAnimations()).toHaveLength(0);
      await m.rerender({ when: true });
      expect(runningAnimations()).toHaveLength(3);
    });

    it("focus in a later child reveals all the children at once with no entrance", async () => {
      const m = await mount({ interval: 500 });
      await focusChild(m, -1);
      expect(shown(m.element())).toBe(true);
      expect(animations).toHaveLength(0);
    });

    it("focus in a child does not reveal the children with when: false", async () => {
      const m = await mount({ when: false, interval: 500 });
      await focusChild(m, -1);
      expect(m.element().getAttribute("data-awesome-reveal")).toBe("cascade");
      expect(animations).toHaveLength(0);
      await m.rerender({ when: true, interval: 500 });
      expect(shown(m.element())).toBe(true);
      expect(animations).toHaveLength(0);
    });

    it("onReveal is called with the container", async () => {
      const onReveal = vi.fn();
      const m = await mount({ onReveal, when: true });
      expect(onReveal.mock.calls).toEqual([[m.element()]]);
    });

    it("onReveal sees the container without the hidden attribute", async () => {
      const attributes: (string | null)[] = [];
      const onReveal = (element: Element) =>
        attributes.push(element.getAttribute("data-awesome-reveal"));
      const m = await mount({ onReveal, when: true });
      await m.rerender({ when: false, onReveal });
      expect(m.element().getAttribute("data-awesome-reveal")).toBe("cascade");
      await m.rerender({ when: true, onReveal });
      expect(attributes).toEqual([null, null]);
    });

    it("reduced motion shows the children with no animation", async () => {
      vi.stubGlobal("matchMedia", () => ({ matches: true }));
      const m = await mount();
      expect(shown(m.element())).toBe(true);
      expect(animations).toHaveLength(0);
    });

    it("print shows the children in their delay until the print ends", async () => {
      const m = await mount({ when: true });
      const fills = () =>
        animations.map((animation) => animation.effect.updateTiming.mock.lastCall?.[0].fill);
      dispatchEvent(new Event("beforeprint"));
      expect(fills()).toEqual(["none", "none", "none"]);
      dispatchEvent(new Event("afterprint"));
      expect(fills()).toEqual(["backwards", "backwards", "backwards"]);
      await m.unmount();
      await m.flush();
      dispatchEvent(new Event("beforeprint"));
      expect(fills()).toEqual(["backwards", "backwards", "backwards"]);
    });

    it("unmount cancels the animations of all the children", async () => {
      const m = await mount({ when: true });
      await m.unmount();
      await m.flush();
      expect(runningAnimations()).toHaveLength(0);
    });
  });
}
