import { collectWindowErrors } from "@awesome-reveal/test-utils/reports";
import { createStage, intersect, scrollToTop } from "@awesome-reveal/test-utils/layout";
import { expectSame, trackAnimations, trackObservers } from "@awesome-reveal/test-utils/spies";

import type { RevealElement } from "../../src/element";

let animate: ReturnType<typeof trackAnimations>;
let observers: ReturnType<typeof trackObservers>;
let stage: HTMLElement;

// The stage is below the fold, so the element reveals only when the test scrolls to it.
beforeEach(() => {
  animate = trackAnimations();
  observers = trackObservers();
  stage = createStage();
});

function render(options?: object) {
  stage.innerHTML = `<awesome-reveal><p data-awesome-reveal="hidden">hello</p></awesome-reveal>`;
  const host = stage.querySelector<RevealElement>("awesome-reveal")!;
  // Sets the attribute after the connection, as the browser parser can.
  if (options) host.setAttribute("options", JSON.stringify(options));
  return { host, element: host.firstElementChild as HTMLElement };
}

function connect(options: object, when?: string) {
  const host = document.createElement("awesome-reveal") as RevealElement;
  host.setAttribute("options", JSON.stringify(options));
  if (when != null) host.setAttribute("when", when);
  host.innerHTML = `<p data-awesome-reveal="hidden">hello</p>`;
  stage.append(host);
  return { host, element: host.firstElementChild as HTMLElement };
}

// The TypeScript DOM lib does not have moveBefore() yet.
type MovableParent = ParentNode & { moveBefore(node: Node, child: Node | null): void };

// WebKit has no moveBefore(). The callback is what the browser calls instead of the disconnection.
function move(host: RevealElement) {
  if ("moveBefore" in Element.prototype) (host.parentNode as MovableParent).moveBefore(host, null);
  else host.connectedMoveCallback();
}

describe("<awesome-reveal>", () => {
  it("hides its first element child, and reveals it with the options of the attribute", async () => {
    const { element } = connect({ duration: 100, threshold: 0.5 });

    expect(element).toHaveStyle({ opacity: "0" });
    expect(observers.observerOf(element)?.thresholds).toEqual([0, 0.5]);

    await intersect(element);

    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expectSame(
      animate.calls().map((call) => call.element),
      [element],
    );
    expect(animate.calls()[0]?.options).toMatchObject({ duration: 100 });
  });

  it("uses the default options without an attribute", async () => {
    const { element } = render();

    await intersect(element);

    expect(animate.calls()[0]?.options).toMatchObject({ duration: 600, delay: 0 });
  });

  it("reveals at once with `when`, and does not observe the viewport", () => {
    const { element } = connect({}, "true");

    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expect(observers.observerOf(element)).toBeUndefined();
    expect(animate.calls()).toHaveLength(1);
  });

  it("applies a change of the options attribute", () => {
    const { host, element } = connect({ duration: 100 }, "false");

    host.setAttribute("options", JSON.stringify({ duration: 200 }));
    host.when = true;

    expect(animate.calls()).toHaveLength(1);
    expect(animate.calls()[0]?.element).toBe(element);
    expect(animate.calls()[0]?.options).toMatchObject({ duration: 200 });
  });

  it("reflects `when` in its attribute, and tells whether it is revealed", () => {
    const { host, element } = connect({}, "false");
    expect(host.when).toBe(false);
    expect(host.revealed).toBe(false);
    expect(element).toHaveStyle({ opacity: "0" });

    host.when = true;
    expect(host.getAttribute("when")).toBe("true");
    expect(host.revealed).toBe(true);
    expect(element).not.toHaveAttribute("data-awesome-reveal");

    host.when = null;
    expect(host.hasAttribute("when")).toBe(false);
    expect(host.when).toBeNull();
    expect(observers.observerOf(element)).toBeDefined();
  });

  it("dispatches a reveal event that bubbles from the element at each reveal", async () => {
    const { host, element } = connect({});
    const targets: EventTarget[] = [];
    host.addEventListener("reveal", (event) => targets.push(event.target!));

    await intersect(element);
    host.when = false;
    host.when = true;

    expectSame(targets, [element, element]);
  });

  it("stops the observation when it leaves the document", async () => {
    const { host, element } = connect({});
    expect(observers.observerOf(element)).toBeDefined();

    host.remove();
    await Promise.resolve();

    expect(observers.observerOf(element)).toBeUndefined();
  });

  it("keeps its state when it leaves and enters the document in one task", async () => {
    const { host, element } = connect({});
    await intersect(element);

    stage.append(document.createElement("div"), host);
    await Promise.resolve();

    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expect(observers.observerOf(element)).toBeUndefined();
    expect(animate.calls()).toHaveLength(1);
  });

  it.each(["re-append", "moveBefore"])(
    "keeps the observer of a hidden element after a %s",
    async (action) => {
      const { host, element } = connect({});
      const observer = observers.observerOf(element);
      expect(observer).toBeDefined();

      if (action === "moveBefore") move(host);
      else stage.append(document.createElement("div"), host);
      await Promise.resolve();

      expect(element).toHaveAttribute("data-awesome-reveal", "hidden");
      expect(observers.observerOf(element)).toBe(observer);
    },
  );

  it("keeps its state when moveBefore() moves it", async () => {
    const { host, element } = connect({});
    await intersect(element);

    move(host);

    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expect(observers.observerOf(element)).toBeUndefined();
  });

  it("hides and observes the element again when it enters the document later", async () => {
    const { host, element } = connect({});
    await intersect(element);
    host.remove();
    await Promise.resolve();
    // The element must not intersect when it enters the document.
    scrollToTop();

    stage.append(host);

    expect(element).toHaveStyle({ opacity: "0" });
    expect(observers.observerOf(element)).toBeDefined();
  });

  describe("on a prerendered page", () => {
    function setPrerendering(value: boolean) {
      Object.defineProperty(document, "prerendering", { configurable: true, value });
    }

    function activate() {
      setPrerendering(false);
      document.dispatchEvent(new Event("prerenderingchange"));
    }

    beforeEach(() => setPrerendering(true));

    afterEach(() => {
      delete (document as { prerendering?: boolean }).prerendering;
    });

    it("waits for the activation", () => {
      const { element } = connect({});
      expect(observers.observerOf(element)).toBeUndefined();

      activate();

      expect(observers.observerOf(element)).toBeDefined();
    });

    it("reads the options at the activation", () => {
      const { host, element } = connect({});
      host.setAttribute("options", JSON.stringify({ threshold: 0.5 }));

      activate();

      expect(observers.observerOf(element)?.thresholds).toEqual([0, 0.5]);
    });

    it("keeps a focused element hidden at the connection with when: false", () => {
      const { host, element } = connect({}, "false");
      const onReveal = vi.fn();
      host.addEventListener("reveal", onReveal);
      element.tabIndex = -1;
      element.focus({ preventScroll: true });

      activate();

      expect(element).toHaveAttribute("data-awesome-reveal", "hidden");
      expect(onReveal).not.toHaveBeenCalled();
    });

    it("does nothing at the activation when the element is removed", () => {
      const { host, element } = connect({});
      host.remove();

      activate();

      expect(observers.observerOf(element)).toBeUndefined();
    });
  });

  function connectRaw(value: string) {
    const host = document.createElement("awesome-reveal") as RevealElement;
    host.setAttribute("options", value);
    host.innerHTML = `<p data-awesome-reveal="hidden">hello</p>`;
    stage.append(host);
    return host.firstElementChild as HTMLElement;
  }

  it.each(["null", '"slide"', "5"])(
    "reveals with the default options when the attribute is %s",
    async (value) => {
      const element = connectRaw(value);

      await intersect(element);

      expect(element).not.toHaveAttribute("data-awesome-reveal");
      expect(animate.calls()).toHaveLength(1);
    },
  );

  it("reports an invalid options attribute and reveals with the defaults", async () => {
    const stop = collectWindowErrors();
    const element = connectRaw("{");
    const errors = stop();

    await intersect(element);

    expect(errors).toEqual([expect.any(SyntaxError)]);
    expect(element).not.toHaveAttribute("data-awesome-reveal");
    expect(animate.calls()[0]?.options).toMatchObject({ duration: 600 });
  });

  it("lets the viewport reveal with an invalid options attribute, also with when: false", async () => {
    const stop = collectWindowErrors();
    const host = document.createElement("awesome-reveal") as RevealElement;
    host.setAttribute("options", "{");
    host.setAttribute("when", "false");
    host.innerHTML = `<p data-awesome-reveal="hidden">hello</p>`;
    stage.append(host);
    const errors = stop();
    const element = host.firstElementChild as HTMLElement;

    await intersect(element);

    expect(errors).toEqual([expect.any(SyntaxError)]);
    expect(element).not.toHaveAttribute("data-awesome-reveal");
  });

  it("uses the default options when the attribute changes to null", async () => {
    const { host, element } = connect({ duration: 100 });

    host.setAttribute("options", "null");
    await intersect(element);

    expect(animate.calls()).toHaveLength(1);
    expect(animate.calls()[0]?.element).toBe(element);
    expect(animate.calls()[0]?.options).toMatchObject({ duration: 600 });
  });

  it("keeps the previous options when the attribute changes to invalid JSON", async () => {
    const { host, element } = connect({ duration: 100 });
    const stop = collectWindowErrors();
    host.setAttribute("options", "{");
    const errors = stop();
    await intersect(element);

    expect(errors).toEqual([expect.any(SyntaxError)]);
    expect(animate.calls()).toHaveLength(1);
    expect(animate.calls()[0]?.element).toBe(element);
    expect(animate.calls()[0]?.options).toMatchObject({ duration: 100 });
  });

  it("reports a host whose element child the parser moved out", () => {
    const stop = collectWindowErrors();
    stage.innerHTML =
      '<p>Intro <awesome-reveal><div data-awesome-reveal="hidden">hello</div></awesome-reveal></p>';
    const errors = stop();

    expect(stage.querySelector("awesome-reveal")!.childElementCount).toBe(0);
    expect(errors).toEqual([
      expect.objectContaining({
        message: expect.stringContaining("moved the element out of <awesome-reveal>"),
      }),
    ]);
  });
});
