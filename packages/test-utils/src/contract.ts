import type { CascadeOptions } from "@awesome-reveal/core/adapter";

import { easing } from "./entrance-fixtures";
import { createStage, intersect, scrollIntoView, scrollToTop, settle, showPart } from "./layout";
import { setReducedMotion } from "./reduced-motion";
import { collectReports, collectWindowErrors } from "./reports";
import { expectSame, trackAnimations, trackObservers } from "./spies";

export type ContractOptions = CascadeOptions;

export interface MountInit {
  container: HTMLElement;
  style?: Partial<CSSStyleDeclaration>;
}

/** Each method resolves after the framework committed the change. */
export interface Mounted {
  element(): HTMLElement;
  rerender(options: ContractOptions): Promise<void>;
  unmount(): Promise<void>;
  /** Renders a new element for the same reveal, such as a new `as` tag, with these options. */
  replaceNode?(options?: ContractOptions): Promise<void>;
}

export interface Harness {
  /** Renders an element with `data-contract` and three element children into the container. */
  mount(options: ContractOptions, init: MountInit): Promise<Mounted>;
  /** Set to `true` when the framework can render a new element for the same reveal. */
  replacesNode?: boolean;
  /** Set to `true` when the reveal belongs to its element, so a new element starts a new reveal. */
  boundToElement?: boolean;
}

const hidden = (element: HTMLElement) => element.getAttribute("data-awesome-reveal") === "hidden";

const shown = (element: HTMLElement) => !element.hasAttribute("data-awesome-reveal");

// `:focus-within` needs real focus, so the scenarios focus a child and do not dispatch `focusin`.
// The element stays below the fold, so a reveal can come only from the focus.
const focusChild = (m: Mounted, index = 0) => {
  const child = Array.from(m.element().children).at(index) as HTMLElement;
  child.tabIndex = -1;
  child.focus({ preventScroll: true });
  expect(m.element().getBoundingClientRect().top).toBeGreaterThan(innerHeight);
};

let run = 0;

function createMount(harness: Harness) {
  let current: Mounted | undefined;

  afterEach(async () => {
    await current?.unmount();
    current = undefined;
    document.body.innerHTML = "";
  });

  return async (options: ContractOptions = {}, init?: Omit<MountInit, "container">) => {
    current = await harness.mount(options, { ...init, container: createStage() });
    return current;
  };
}

export function describeContract(name: string, harness: Harness) {
  describe(`reveal contract: ${name}`, () => {
    const mount = createMount(harness);
    let animate: ReturnType<typeof trackAnimations>;
    let observers: ReturnType<typeof trackObservers>;

    beforeEach(() => {
      animate = trackAnimations();
      observers = trackObservers();
    });

    const rerender = (m: Mounted, options: ContractOptions) => m.rerender(options);

    it("hides the element at the start", async () => {
      const m = await mount();
      expect(hidden(m.element())).toBe(true);
      expect(animate.calls()).toHaveLength(0);
      expect(observers.observerOf(m.element())).toBeDefined();
    });

    it("reveals once on intersect", async () => {
      const m = await mount();
      await intersect(m.element());
      expect(shown(m.element())).toBe(true);
      expectSame(
        animate.calls().map((a) => a.element),
        [m.element()],
      );
      expect(observers.observerOf(m.element())).toBeUndefined();
    });

    it("when: true shows and plays with no observer", async () => {
      const m = await mount({ when: true });
      expect(shown(m.element())).toBe(true);
      expect(animate.calls()).toHaveLength(1);
      expect(observers.live()).toHaveLength(0);
    });

    it("when: false stays hidden with no observer", async () => {
      const m = await mount({ when: false });
      expect(hidden(m.element())).toBe(true);
      expect(observers.live()).toHaveLength(0);
    });

    it("when: undefined observes", async () => {
      const m = await mount({ when: undefined });
      expect(observers.observerOf(m.element())).toBeDefined();
    });

    it("when: null observes", async () => {
      const m = await mount({ when: null });
      expect(observers.observerOf(m.element())).toBeDefined();
      await intersect(m.element());
      expect(shown(m.element())).toBe(true);
    });

    it("a toggle of when replays", async () => {
      const m = await mount({ when: false });
      await rerender(m, { when: true });
      expect(shown(m.element())).toBe(true);
      await rerender(m, { when: false });
      expect(hidden(m.element())).toBe(true);
      expect(animate.active()).toHaveLength(0);
      await rerender(m, { when: true });
      expect(animate.calls()).toHaveLength(2);
      expect(animate.active()).toHaveLength(1);
    });

    it("a change of threshold restarts the observer", async () => {
      const m = await mount({ threshold: 0.5 });
      const before = observers.observerOf(m.element());
      await rerender(m, { threshold: 0.2 });
      const after = observers.observerOf(m.element());
      expect(after).toBeDefined();
      expect(after).not.toBe(before);
      expect(observers.live()).toHaveLength(1);
    });

    it("reveals when the element leaves before it reaches the threshold", async () => {
      const m = await mount({ threshold: 0.5 });
      showPart(m.element(), 0.2);
      await settle();
      expect(hidden(m.element())).toBe(true);
      scrollToTop();
      await expect.element(m.element()).not.toHaveAttribute("data-awesome-reveal");
      expect(shown(m.element())).toBe(true);
      expect(animate.active()).toHaveLength(1);
    });

    it("the other options apply at the next reveal", async () => {
      const m = await mount({ duration: 300 });
      const before = observers.observerOf(m.element());
      await rerender(m, { duration: 400 });
      expect(observers.observerOf(m.element())).toBe(before);
      await intersect(m.element());
      await rerender(m, { duration: 500 });
      expect(animate.calls()).toHaveLength(1);
      expect(animate.calls()[0]!.options).toMatchObject({ duration: 400 });
      await rerender(m, { when: false, duration: 500 });
      await rerender(m, { when: true, duration: 500 });
      expect(animate.calls()[1]!.options).toMatchObject({ duration: 500 });
    });

    it("passes delay to core, and not to the element", async () => {
      const m = await mount({ delay: 150, when: true });
      expect(animate.calls()[0]!.options).toMatchObject({ delay: 150 });
      expect(m.element().hasAttribute("delay")).toBe(false);
    });

    it("a hide during the delay cancels the entrance and hides the element", async () => {
      const m = await mount({ delay: 60_000, when: true });
      expect(animate.calls()[0]!.options).toMatchObject({ delay: 60_000 });
      await rerender(m, { delay: 60_000, when: false });
      expect(hidden(m.element())).toBe(true);
      expect(animate.calls()).toHaveLength(1);
      expect(animate.active()).toHaveLength(0);
    });

    it("print shows the element in its delay until the print ends", async () => {
      const m = await mount({ delay: 60_000, when: true });
      const { animation } = animate.calls()[0]!;
      const fill = () => animation.effect!.getTiming().fill;
      dispatchEvent(new Event("beforeprint"));
      expect(fill()).toBe("none");
      dispatchEvent(new Event("afterprint"));
      expect(fill()).toBe("backwards");
      expect(animation.playState).toBe("running");
      expect(shown(m.element())).toBe(true);
    });

    it("reduced motion shows the element with no animation, also with a delay", async () => {
      await setReducedMotion("reduce");
      const m = await mount({ delay: 60_000 });
      await intersect(m.element());
      expect(shown(m.element())).toBe(true);
      expect(animate.calls()).toHaveLength(0);
    });

    it("switching to reduced motion cancels the entrance and exposes content", async () => {
      const m = await mount({ when: false });
      await setReducedMotion("reduce");
      await expect.element(m.element()).not.toHaveAttribute("data-awesome-reveal");
      expect(shown(m.element())).toBe(true);
      expect(animate.active()).toHaveLength(0);
      expect(observers.observerOf(m.element())).toBeUndefined();
    });

    it("the reveal keeps the inline style of the user", async () => {
      const m = await mount({}, { style: { opacity: "0.5", color: "red" } });
      expect(m.element().style.opacity).toBe("0.5");
      await intersect(m.element());
      expect(m.element().style.opacity).toBe("0.5");
      expect(m.element().style.color).toBe("red");
    });

    it("unmount cancels the animation and the observer", async () => {
      const m = await mount();
      await intersect(m.element());
      await m.unmount();
      await expect.poll(() => animate.active()).toHaveLength(0);
      expect(observers.live()).toHaveLength(0);
    });

    if (harness.replacesNode) {
      it(
        harness.boundToElement
          ? "a new element after the reveal starts a new reveal"
          : "a new element after the reveal does not replay",
        async () => {
          const m = await mount();
          await intersect(m.element());
          const old = m.element();
          await m.replaceNode?.();
          expect(m.element()).not.toBe(old);
          if (harness.boundToElement) {
            expect(hidden(m.element())).toBe(true);
            expect(observers.observerOf(m.element())).toBeDefined();
          } else {
            expect(shown(m.element())).toBe(true);
            expect(animate.calls()).toHaveLength(1);
            expect(observers.live()).toHaveLength(0);
          }
        },
      );

      it("a new element before the reveal is observed", async () => {
        const m = await mount();
        await m.replaceNode?.();
        expect(hidden(m.element())).toBe(true);
        expect(observers.observerOf(m.element())).toBeDefined();
        expect(observers.live()).toHaveLength(1);
      });

      it("a new element and `when: true` in one update play on the new element", async () => {
        const m = await mount({ when: false });
        await m.replaceNode?.({ when: true });
        expect(shown(m.element())).toBe(true);
        expectSame(
          animate.calls().map((a) => a.element),
          [m.element()],
        );
        expect(animate.active()).toHaveLength(1);
      });
    }

    it("onReveal is called with the element at each reveal", async () => {
      const onReveal = vi.fn();
      const m = await mount({ onReveal });
      expect(onReveal).not.toHaveBeenCalled();
      await intersect(m.element());
      expectSame(
        onReveal.mock.calls.map(([element]) => element),
        [m.element()],
      );
      await rerender(m, { when: false, onReveal });
      await rerender(m, { when: true, onReveal });
      expect(onReveal).toHaveBeenCalledTimes(2);
    });

    it("onReveal sees the element without the hidden attribute", async () => {
      const attributes: (string | null)[] = [];
      const onReveal = (element: Element) =>
        attributes.push(element.getAttribute("data-awesome-reveal"));
      const m = await mount({ onReveal });
      await intersect(m.element());
      await rerender(m, { when: false, onReveal });
      expect(hidden(m.element())).toBe(true);
      await rerender(m, { when: true, onReveal });
      expect(attributes).toEqual([null, null]);
    });

    it("direction builds the entrance", async () => {
      const m = await mount({ from: "left" });
      await intersect(m.element());
      const [, move] = animate.calls()[0]!.keyframes;
      expect(move).toMatchObject({ translate: "-24px 0px" });
      expect(move!.easing).toBe(easing);
    });

    it("marks the element as attached until it unmounts", async () => {
      const m = await mount();
      const element = m.element();
      expect(element.hasAttribute("data-awesome-reveal-attached")).toBe(true);
      await intersect(m.element());
      expect(element.hasAttribute("data-awesome-reveal-attached")).toBe(true);
      await m.unmount();
      await expect.poll(() => element.hasAttribute("data-awesome-reveal-attached")).toBe(false);
    });

    it("focus in the element reveals it at once with no entrance, also below the threshold", async () => {
      const onReveal = vi.fn();
      const m = await mount({ threshold: 0.5, delay: 2000, onReveal });
      focusChild(m);
      await expect.element(m.element()).not.toHaveAttribute("data-awesome-reveal");
      expect(shown(m.element())).toBe(true);
      expect(observers.observerOf(m.element())).toBeUndefined();
      expect(animate.calls()).toHaveLength(0);
      expectSame(
        onReveal.mock.calls.map(([element]) => element),
        [m.element()],
      );
    });

    it("a reveal of an element that contains focus plays no entrance", async () => {
      const onReveal = vi.fn();
      const m = await mount({ when: false, onReveal });
      focusChild(m);
      await settle();
      expect(hidden(m.element())).toBe(true);
      await rerender(m, { when: true, onReveal });
      expect(shown(m.element())).toBe(true);
      expect(animate.calls()).toHaveLength(0);
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
      await expect.poll(() => focusListeners(unlisten)).toEqual(focusListeners(listen));
    });

    it("focus does not reveal the element with when: false", async () => {
      const m = await mount({ when: false });
      focusChild(m);
      await settle();
      expect(hidden(m.element())).toBe(true);
      expect(animate.calls()).toHaveLength(0);
    });

    it.each([
      ["below the fold", false],
      ["in view", true],
    ])("a change from when: true to null keeps the element revealed %s", async (_, inView) => {
      const onReveal = vi.fn();
      const m = await mount({ when: true, onReveal });
      if (inView) scrollIntoView(m.element());
      await rerender(m, { when: null, onReveal });
      await settle();
      expect(shown(m.element())).toBe(true);
      expect(observers.observerOf(m.element())).toBeUndefined();
      expect(animate.calls()).toHaveLength(1);
      expect(onReveal).toHaveBeenCalledOnce();
    });

    it("a change from when: true to null after reduced motion ends keeps the element revealed", async () => {
      await setReducedMotion("reduce");
      const m = await mount({ when: true });
      await setReducedMotion("no-preference");
      await rerender(m, { when: null });
      await settle();
      expect(shown(m.element())).toBe(true);
      expect(observers.observerOf(m.element())).toBeUndefined();
      expect(animate.calls()).toHaveLength(0);
    });

    it("a change from when: false to null with focus inside shows the element at once with no entrance", async () => {
      const onReveal = vi.fn();
      const m = await mount({ when: false, onReveal });
      focusChild(m);
      await rerender(m, { when: null, onReveal });
      expect(shown(m.element())).toBe(true);
      expect(observers.observerOf(m.element())).toBeUndefined();
      expect(animate.calls()).toHaveLength(0);
      expect(onReveal).toHaveBeenCalledOnce();
    });

    it("a change from when: true to false with focus inside resets the entrance and keeps the focus", async () => {
      const m = await mount({ when: true });
      focusChild(m);
      await rerender(m, { when: false });
      expect(hidden(m.element())).toBe(true);
      expect(animate.active()).toHaveLength(0);
      expect(document.activeElement).toBe(m.element().children[0]);
    });

    it("reduced motion shows the element with when: false at mount", async () => {
      await setReducedMotion("reduce");
      const m = await mount({ when: false });
      expect(shown(m.element())).toBe(true);
      expect(animate.calls()).toHaveLength(0);
    });

    it("with no IntersectionObserver the element shows at once", async () => {
      vi.stubGlobal("IntersectionObserver", undefined);
      const m = await mount();
      await settle();
      expect(shown(m.element())).toBe(true);
      expect(animate.calls()).toHaveLength(1);
    });

    it("a throwing IntersectionObserver shows the element", async () => {
      const message = `Invalid threshold: ${name} ${++run}`;
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
      expect(await reports()).toEqual([new SyntaxError(message)]);
      const element = document.querySelector<HTMLElement>("[data-contract]");
      expect(element && shown(element)).toBe(true);
    });

    it("invalid native keyframes leave the element visible, and report once", async () => {
      const message = `Invalid easing: ${name} ${++run}`;
      animate.rejectEasing("bogus", new TypeError(message));
      const keyframes = [{ opacity: 0, easing: "bogus" }, { opacity: 1 }];
      const reports = collectReports();
      const m = await mount({ keyframes });
      await intersect(m.element());
      await rerender(m, { when: false, keyframes });
      await rerender(m, { when: true, keyframes });
      await settle();
      expect(shown(m.element())).toBe(true);
      expect(await reports()).toEqual([new TypeError(message)]);
    });
  });
}

/** Runs the cascade scenarios. The harness renders the cascade container with three element children. */
export function describeCascadeContract(name: string, harness: Harness) {
  describe(`cascade contract: ${name}`, () => {
    const mount = createMount(harness);
    let animate: ReturnType<typeof trackAnimations>;
    let observers: ReturnType<typeof trackObservers>;

    beforeEach(() => {
      animate = trackAnimations();
      observers = trackObservers();
    });

    const children = (m: Mounted) => Array.from(m.element().children);
    const delays = () => animate.calls().map((call) => call.options.delay);

    it("hides the children with the container attribute and observes the container", async () => {
      const m = await mount();
      expect(m.element().getAttribute("data-awesome-reveal")).toBe("cascade");
      expect(animate.calls()).toHaveLength(0);
      expect(observers.observerOf(m.element())).toBeDefined();
    });

    it("reveals the direct children in sequence on intersect", async () => {
      const m = await mount();
      await intersect(m.element());
      expect(shown(m.element())).toBe(true);
      expectSame(
        animate.calls().map((a) => a.element),
        children(m),
      );
      expect(delays()).toEqual([0, 80, 160]);
      expect(observers.observerOf(m.element())).toBeUndefined();
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
      expect(animate.active()).toHaveLength(0);
      await m.rerender({ when: true });
      expect(animate.active()).toHaveLength(3);
    });

    it("focus in a later child reveals all the children at once with no entrance", async () => {
      const m = await mount({ interval: 500 });
      focusChild(m, -1);
      await expect.element(m.element()).not.toHaveAttribute("data-awesome-reveal");
      expect(shown(m.element())).toBe(true);
      expect(animate.calls()).toHaveLength(0);
    });

    it("focus in a child does not reveal the children with when: false", async () => {
      const m = await mount({ when: false, interval: 500 });
      focusChild(m, -1);
      await settle();
      expect(m.element().getAttribute("data-awesome-reveal")).toBe("cascade");
      expect(animate.calls()).toHaveLength(0);
      await m.rerender({ when: true, interval: 500 });
      expect(shown(m.element())).toBe(true);
      expect(animate.calls()).toHaveLength(0);
    });

    it("onReveal is called with the container", async () => {
      const onReveal = vi.fn();
      const m = await mount({ onReveal, when: true });
      expectSame(
        onReveal.mock.calls.map(([element]) => element),
        [m.element()],
      );
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
      await setReducedMotion("reduce");
      const m = await mount();
      expect(shown(m.element())).toBe(true);
      expect(animate.calls()).toHaveLength(0);
    });

    it("print shows the children in their delay until the print ends", async () => {
      const m = await mount({ when: true });
      const fills = () =>
        animate.calls().map(({ animation }) => animation.effect!.getTiming().fill);
      dispatchEvent(new Event("beforeprint"));
      expect(fills()).toEqual(["none", "none", "none"]);
      dispatchEvent(new Event("afterprint"));
      expect(fills()).toEqual(["backwards", "backwards", "backwards"]);
      await m.unmount();
      await settle();
      dispatchEvent(new Event("beforeprint"));
      expect(fills()).toEqual(["backwards", "backwards", "backwards"]);
    });

    it("unmount cancels the animations of all the children", async () => {
      const m = await mount({ when: true });
      await m.unmount();
      await expect.poll(() => animate.active()).toHaveLength(0);
    });
  });
}
