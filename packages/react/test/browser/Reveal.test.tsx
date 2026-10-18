import { createRef, type ReactNode, version } from "react";
import { render } from "vitest-browser-react";

import { defaultKeyframes, fadeKeyframes } from "@awesome-reveal/test-utils/entrance-fixtures";
import { createStage, intersect } from "@awesome-reveal/test-utils/layout";
import { expectSame, finishEntrances, trackAnimations } from "@awesome-reveal/test-utils/spies";

import { Reveal } from "../../src/Reveal";

let animate: ReturnType<typeof trackAnimations>;

beforeEach(() => {
  animate = trackAnimations();
});

// The stage is below the fold, so the element reveals only when the test scrolls to it.
const show = (ui: ReactNode) => render(ui, { container: createStage() });

describe(`Reveal (React ${version})`, () => {
  it("renders one hidden div around its children", async () => {
    const { container } = await show(
      <Reveal keyframes={fadeKeyframes}>
        <p>one</p>
        text
        <p>two</p>
      </Reveal>,
    );

    const element = container.firstElementChild as HTMLElement;
    expect(container.children).toHaveLength(1);
    expect(element.tagName).toBe("DIV");
    expect(element).toHaveTextContent("onetexttwo");
    expect(element).toHaveStyle({ opacity: "0" });
    expect(element).toHaveAttribute("data-awesome-reveal", "hidden");
    expect(element).not.toHaveAttribute("class");
  });

  it("reveals and animates when it enters the viewport", async () => {
    const { container } = await show(<Reveal keyframes={fadeKeyframes}>child</Reveal>);
    const element = container.firstElementChild as HTMLElement;
    await intersect(element);
    finishEntrances(animate);

    expect(element).toHaveStyle({ opacity: "1" });
    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expect(animate.calls()[0]?.element).toBe(element);
  });

  it("plays the default keyframes without keyframes", async () => {
    const { container } = await show(<Reveal>child</Reveal>);
    await intersect(container.firstElementChild as HTMLElement);

    expect(animate.calls()[0]?.keyframes).toEqual(defaultKeyframes);
  });

  it("renders the tag given by `as`", async () => {
    const screen = await show(
      <Reveal as="ul" keyframes={fadeKeyframes}>
        <li>one</li>
        <li>two</li>
      </Reveal>,
    );
    const list = screen.getByRole("list").element() as HTMLElement;
    await intersect(list);

    expect(animate.calls().map(({ element }) => element.tagName)).toEqual(["UL"]);
  });

  it("passes HTML attributes through", async () => {
    const screen = await show(
      <Reveal as="a" keyframes={fadeKeyframes} href="/docs" className="link" aria-label="Docs" />,
    );

    await expect
      .element(screen.getByRole("link", { name: "Docs" }))
      .toHaveAttribute("href", "/docs");
    await expect.element(screen.getByRole("link")).toHaveClass("link", { exact: true });
  });

  it("hides an element with its own style, and keeps that style when revealed", async () => {
    const { container } = await show(
      <Reveal keyframes={fadeKeyframes} style={{ color: "red", opacity: 0.5 }}>
        child
      </Reveal>,
    );
    const element = container.firstElementChild as HTMLElement;

    expect(element).toHaveStyle({ color: "rgb(255, 0, 0)", opacity: "0" });

    await intersect(element);
    finishEntrances(animate);
    expect(element).toHaveStyle({ color: "rgb(255, 0, 0)", opacity: "0.5" });
  });

  it("leaves children and their refs untouched", async () => {
    const ref = createRef<HTMLSpanElement>();
    const screen = await show(
      <Reveal keyframes={fadeKeyframes}>
        <span ref={ref} className="child">
          child
        </span>
      </Reveal>,
    );

    expect(ref.current).toBe(screen.getByText("child").element());
    expect(ref.current).toHaveClass("child", { exact: true });
  });

  it("renders no text for boolean children", async () => {
    const { container } = await show(<Reveal keyframes={fadeKeyframes}>{false}</Reveal>);

    expect(container).toHaveTextContent("");
  });

  describe("ref", () => {
    it("sets an object ref and still reveals the element", async () => {
      const ref = createRef<HTMLDivElement>();
      const { unmount } = await show(<Reveal keyframes={fadeKeyframes} ref={ref} />);
      const element = ref.current!;

      expect(element.tagName).toBe("DIV");
      await intersect(element);
      expect(animate.calls()[0]?.element).toBe(element);

      await unmount();
      expect(ref.current).toBeNull();
    });

    it("calls a callback ref with the element, then with null", async () => {
      const ref = vi.fn();
      const { container, unmount } = await show(
        <Reveal as="section" keyframes={fadeKeyframes} ref={ref} />,
      );
      const element = container.firstElementChild;

      await intersect(element as HTMLElement);
      await unmount();

      expectSame(
        ref.mock.calls.map(([node]) => node),
        [element, null],
      );
      expect(animate.calls()[0]?.element).toBe(element);
    });

    it("keeps the same ref callback across renders with the same ref", async () => {
      const ref = vi.fn();
      const { rerender } = await show(<Reveal keyframes={fadeKeyframes} ref={ref} className="a" />);
      await rerender(<Reveal keyframes={fadeKeyframes} ref={ref} className="b" />);

      expect(ref).toHaveBeenCalledTimes(1);
    });

    it("does not replay the animation when the callback ref changes on each render", async () => {
      const { container, rerender } = await show(
        <Reveal keyframes={fadeKeyframes} ref={() => {}} />,
      );
      await intersect(container.firstElementChild as HTMLElement);
      await rerender(<Reveal keyframes={fadeKeyframes} ref={() => {}} />);
      await rerender(<Reveal keyframes={fadeKeyframes} ref={() => {}} />);

      expect(animate.calls()).toHaveLength(1);
    });

    // React 18 does not support cleanup functions from callback refs.
    it.runIf(version.startsWith("19."))(
      "runs the cleanup that a callback ref returns",
      async () => {
        const cleanup = vi.fn();
        const ref = vi.fn<(node: HTMLDivElement | null) => VoidFunction>(() => cleanup);
        const { container, unmount } = await show(<Reveal keyframes={fadeKeyframes} ref={ref} />);
        const element = container.firstElementChild!;

        await unmount();

        expectSame(
          ref.mock.calls.map(([node]) => node),
          [element],
        );
        expect(cleanup).toHaveBeenCalledOnce();
      },
    );
  });
});
