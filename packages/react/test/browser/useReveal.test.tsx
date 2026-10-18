import {
  forwardRef,
  type ReactNode,
  StrictMode,
  Suspense,
  useLayoutEffect,
  useState,
  version,
} from "react";
import { render } from "vitest-browser-react";

import { defaultKeyframes } from "@awesome-reveal/test-utils/entrance-fixtures";
import { createStage, scrollIntoView, settle, showPart } from "@awesome-reveal/test-utils/layout";
import { setReducedMotion } from "@awesome-reveal/test-utils/reduced-motion";
import { trackAnimations, trackObservers, withoutAnimate } from "@awesome-reveal/test-utils/spies";

import { type RevealOptions, useReveal } from "../../src/useReveal";
import { useCascade } from "../../src/useCascade";

let animate: ReturnType<typeof trackAnimations>;
let observers: ReturnType<typeof trackObservers>;

beforeEach(() => {
  animate = trackAnimations();
  observers = trackObservers();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Box(props: Partial<RevealOptions>) {
  const { getProps, revealed } = useReveal<HTMLDivElement>(props as RevealOptions);

  return (
    <div {...getProps({ "data-testid": "box", "data-revealed": revealed })}>
      <span>one</span>
      <span>two</span>
      <span>three</span>
    </div>
  );
}

// The stage is below the fold, so the element reveals only when the test scrolls to it.
const show = (ui: ReactNode) => render(ui, { container: createStage() });

function box(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-testid="box"]')!;
}

async function intersect(element: HTMLElement) {
  scrollIntoView(element);
  await expect.element(element).not.toHaveAttribute("data-awesome-reveal");
}

// The entrance runs for its full duration, so the test ends it to read the final style.
function finishEntrances() {
  for (const animation of animate.active()) animation.finish();
}

describe(`useReveal (React ${version})`, () => {
  it("hides the element until it enters the viewport", async () => {
    await show(<Box />);

    expect(box()).toHaveStyle({ opacity: "0" });
    expect(box()).toHaveAttribute("data-revealed", "false");
    expect(animate.calls()).toHaveLength(0);
  });

  it("reveals and animates the element when it enters the viewport", async () => {
    await show(<Box />);
    await intersect(box());
    finishEntrances();

    expect(box()).toHaveStyle({ opacity: "1" });
    await expect.element(box()).toHaveAttribute("data-revealed", "true");
    expect(animate.calls()).toHaveLength(1);
    expect(animate.calls()[0]).toMatchObject({
      element: box(),
      keyframes: defaultKeyframes,
      options: { duration: 600, delay: 0, fill: "backwards" },
    });
  });

  it("waits until the visible fraction reaches the threshold", async () => {
    await show(<Box threshold={0.5} />);

    showPart(box(), 0.2);
    await settle();
    expect(box()).toHaveStyle({ opacity: "0" });

    showPart(box(), 0.6);
    await expect.element(box()).not.toHaveAttribute("data-awesome-reveal");
    finishEntrances();
    expect(box()).toHaveStyle({ opacity: "1" });
  });

  it("stops observing after the first reveal by default", async () => {
    await show(<Box />);
    await intersect(box());

    expect(observers.observerOf(box())).toBeUndefined();
  });

  it("cancels the animation on unmount", async () => {
    const { unmount } = await show(<Box />);
    await intersect(box());
    await unmount();

    await expect.poll(() => animate.active()).toHaveLength(0);
  });

  it("applies option changes to the next reveal without replaying", async () => {
    const keyframes = [{ opacity: 0 }, { opacity: 1 }];
    const { rerender } = await show(<Box duration={300} />);
    await intersect(box());
    await rerender(<Box duration={400} keyframes={keyframes} />);

    expect(animate.calls()).toHaveLength(1);

    await rerender(<Box when={false} duration={400} keyframes={keyframes} />);
    await rerender(<Box when duration={400} keyframes={keyframes} />);
    expect(animate.calls()[1]).toMatchObject({
      keyframes: [{ opacity: 0 }, { opacity: 1 }],
      options: { duration: 400 },
    });
  });

  it("starts the animation in the commit that reveals the element", async () => {
    const animationsAtCommit: number[] = [];
    function Probe() {
      const { getProps, revealed } = useReveal<HTMLDivElement>({ keyframes: defaultKeyframes });
      useLayoutEffect(() => {
        if (revealed) animationsAtCommit.push(animate.calls().length);
      }, [revealed]);
      return <div {...getProps({ "data-testid": "box" })} />;
    }

    await show(<Probe />);
    await intersect(box());

    await expect.poll(() => animationsAtCommit).toEqual([1]);
  });

  it("follows `when` and does not observe the viewport", async () => {
    const { rerender } = await show(<Box when={false} />);

    expect(observers.observerOf(box())).toBeUndefined();
    expect(box()).toHaveStyle({ opacity: "0" });

    await rerender(<Box when />);
    finishEntrances();
    expect(box()).toHaveStyle({ opacity: "1" });
    expect(animate.calls()).toHaveLength(1);
  });

  it.each([true, false])("automatically respects reduced motion: %s", async (reduce) => {
    await setReducedMotion(reduce ? "reduce" : "no-preference");
    await show(<Box />);
    expect(box()).toHaveStyle({ opacity: reduce ? "1" : "0" });
    await intersect(box());
    expect(animate.calls()).toHaveLength(reduce ? 0 : 1);
  });

  it("reveals the element when IntersectionObserver is not available", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    await show(<Box />);
    finishEntrances();

    expect(box()).toHaveStyle({ opacity: "1" });
  });

  it("shows the element without animation when Element.animate is not available", async () => {
    withoutAnimate();
    await show(<Box />);
    await intersect(box());

    expect(box()).toHaveStyle({ opacity: "1" });
  });

  it("leaves one running animation under StrictMode", async () => {
    await show(
      <StrictMode>
        <Box />
      </StrictMode>,
    );
    await intersect(box());

    expect(animate.active()).toHaveLength(1);
  });

  it("calls onReveal once for each reveal under StrictMode", async () => {
    const onReveal = vi.fn();
    await show(
      <StrictMode>
        <Box when onReveal={onReveal} />
      </StrictMode>,
    );

    expect(onReveal.mock.calls).toEqual([[box()]]);
  });

  it("plays the entrance on a new element when `when` turns true as the old one unmounts", async () => {
    function Toggle({ show, when }: { show: boolean; when: boolean }) {
      const { getProps } = useReveal<HTMLDivElement>({ keyframes: defaultKeyframes, when });
      return show ? <div {...getProps({ "data-testid": "box" })} /> : null;
    }
    const { rerender } = await show(<Toggle show when={false} />);
    await rerender(<Toggle show={false} when />);
    await rerender(<Toggle show when />);

    expect(animate.calls().map(({ element }) => element)).toEqual([box()]);
  });

  it("plays the entrance of a new element with the options of the same commit", async () => {
    function Late({ show, duration }: { show: boolean; duration: number }) {
      const { getProps } = useReveal<HTMLDivElement>({
        keyframes: defaultKeyframes,
        when: true,
        duration,
      });
      return show ? <div {...getProps({ "data-testid": "box" })} /> : null;
    }
    const { rerender } = await show(<Late show={false} duration={100} />);
    await rerender(<Late show duration={900} />);

    expect(animate.calls()).toHaveLength(1);
    expect(animate.calls()[0]?.options).toMatchObject({ duration: 900 });
  });

  it.each([
    ["useReveal in the viewport", useReveal, undefined],
    ["useCascade in the viewport", useCascade, undefined],
    ["useReveal with when", useReveal, true],
    ["useCascade with when", useCascade, true],
  ] as const)(
    "%s attaches an element mounted by a child after the hook's commit",
    async (_, useTarget, when) => {
      const onReveal = vi.fn();
      const Late = forwardRef<HTMLDivElement, object>(function Late(props, ref) {
        const [show, setShow] = useState(false);
        return (
          <>
            <button onClick={() => setShow(true)}>Show</button>
            {/* The click scrolls the button into view. The gap keeps the element below the fold. */}
            <div style={{ height: "150vh" }} />
            {show && (
              <div {...props} ref={ref} data-testid="box">
                <span>one</span>
                <span>two</span>
              </div>
            )}
          </>
        );
      });
      function Parent() {
        const { getProps } = useTarget<HTMLDivElement>({ when, onReveal });
        return <Late {...getProps()} />;
      }
      const screen = await show(<Parent />);

      await screen.getByRole("button", { name: "Show" }).click();
      await expect.element(screen.getByTestId("box")).toBeInTheDocument();

      if (when == null) {
        expect(observers.observerOf(box())).toBeDefined();
        await intersect(box());
      } else expect(observers.observerOf(box())).toBeUndefined();
      expect(onReveal).toHaveBeenCalledExactlyOnceWith(box());
      expect(animate.calls().map(({ element }) => element)).toEqual(
        useTarget === useCascade ? Array.from(box().children) : [box()],
      );
      await screen.unmount();
      await expect.poll(() => animate.active()).toHaveLength(0);
    },
  );

  it("does not replay a finished entrance when Suspense in a child hides and shows the element", async () => {
    let resume = () => {};
    let done = false;
    function Pending({ wait }: { wait?: Promise<void> }) {
      if (wait && !done) throw wait;
      return null;
    }
    const Child = forwardRef<HTMLDivElement, object>(function Child(props, ref) {
      const [wait, setWait] = useState<Promise<void>>();
      return (
        <>
          <button onClick={() => setWait(new Promise((resolve) => (resume = resolve)))}>
            Suspend
          </button>
          <Suspense fallback={null}>
            <div {...props} ref={ref} data-testid="box" />
            <Pending wait={wait} />
          </Suspense>
        </>
      );
    });
    function Parent() {
      const { getProps } = useReveal<HTMLDivElement>({ when: true });
      return <Child {...getProps()} />;
    }
    const screen = await show(<Parent />);
    const element = box();
    for (const { animation } of animate.calls()) animation.finish();

    await screen.getByRole("button", { name: "Suspend" }).click();
    await expect.element(element).not.toHaveAttribute("data-awesome-reveal-attached");
    done = true;
    resume();

    await expect.element(element).toHaveAttribute("data-awesome-reveal-attached");
    expect(box()).toBe(element);
    expect(animate.calls()).toHaveLength(1);
  });

  it("does not animate a new element when `when` turns false as it mounts", async () => {
    function Late({ show, when }: { show: boolean; when: boolean }) {
      const { getProps } = useReveal<HTMLDivElement>({ keyframes: defaultKeyframes, when });
      return show ? <div {...getProps({ "data-testid": "box" })} /> : null;
    }
    const { rerender } = await show(<Late show={false} when />);
    await rerender(<Late show when={false} />);

    expect(animate.calls()).toHaveLength(0);
    expect(box()).toHaveStyle({ opacity: "0" });
  });
});
