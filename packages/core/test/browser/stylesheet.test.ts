import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import {
  createCascade,
  createReveal,
  type CascadeOptions,
  type RevealStore,
} from "../../src/adapter";
import css from "../../../react/src/reveal.css?raw";
import { settle } from "@awesome-reveal/test-utils/layout";

const opacity = (element: Element) => getComputedStyle(element).opacity;
const hold = (element: Element) =>
  element
    .getAnimations()
    .find((animation) => (animation as CSSAnimation).animationName === "awesome-reveal-hold");

let stores: RevealStore[];

function bind(store: RevealStore, element: HTMLElement, value: string) {
  stores.push(store);
  store.subscribe((revealed) => {
    if (!revealed) element.setAttribute("data-awesome-reveal", value);
  });
  store.attach(element);
}

beforeEach(() => {
  stores = [];
  document.head.insertAdjacentHTML("beforeend", `<style id="reveal-css">${css}</style>`);
});
afterEach(() => {
  for (const store of stores) store.attach(null);
  document.getElementById("reveal-css")?.remove();
  document.getElementById("author-css")?.remove();
  document.body.innerHTML = "";
});

describe("reveal.css", () => {
  it("hides server markup for a short time, so content that no script attaches shows", () => {
    document.body.innerHTML = `<div id="target" data-awesome-reveal="hidden">a</div>`;
    const target = document.getElementById("target")!;
    expect(opacity(target)).toBe("0");
    hold(target)!.finish();
    expect(opacity(target)).toBe("1");
  });

  it("keeps an attached element hidden after the hold, until it reveals", async () => {
    document.body.innerHTML = `<div id="target" data-awesome-reveal="hidden" style="opacity: 0.5">a</div>`;
    const target = document.getElementById("target")!;
    const store = createReveal({ when: false, duration: 1 });
    bind(store, target, "hidden");
    hold(target)!.finish();
    expect(opacity(target)).toBe("0");
    store.setOptions({ when: true, duration: 1 });
    expect(hold(target)).toBeUndefined();
    await Promise.all(target.getAnimations().map((animation) => animation.finished));
    expect(opacity(target)).toBe("0.5");
  });

  it("shows the element again after a detach and the hold", () => {
    document.body.innerHTML = `<div id="target" data-awesome-reveal="hidden">a</div>`;
    const target = document.getElementById("target")!;
    const store = createReveal({ when: false });
    bind(store, target, "hidden");
    hold(target)!.finish();
    store.attach(null);
    expect(opacity(target)).toBe("1");
  });

  it("keeps a child that renders after the attach hidden in an attached cascade", async () => {
    document.body.innerHTML = `<ul id="list" data-awesome-reveal="cascade"><li>a</li></ul>`;
    const list = document.getElementById("list")!;
    bind(createCascade({ when: false }) as RevealStore, list, "cascade");
    const late = list.appendChild(document.createElement("li"));
    hold(late)!.finish();
    await settle();
    expect(opacity(late)).toBe("0");
  });

  // React and Vue render `revealed` one microtask after the store tells them.
  function bindLikeAFramework(store: RevealStore, element: HTMLElement, value: string) {
    stores.push(store);
    store.subscribe((revealed) =>
      queueMicrotask(() =>
        revealed
          ? element.removeAttribute("data-awesome-reveal")
          : element.setAttribute("data-awesome-reveal", value),
      ),
    );
    store.attach(element);
  }

  it.each([
    ["the element", "hidden", createReveal],
    ["the children of a cascade", "cascade", createCascade],
  ] as const)(
    "lets onReveal wait for the entrance of %s with the finished promises during the hold",
    async (_, value, create) => {
      document.body.innerHTML = `<ul id="target" data-awesome-reveal="${value}"><li>a</li><li>b</li></ul>`;
      const target = document.getElementById("target")!;
      let entrance: Animation[] = [];
      let finished: Promise<unknown> | undefined;
      const options: CascadeOptions = {
        duration: 50,
        interval: 10,
        onReveal(element) {
          entrance = element.getAnimations({ subtree: true });
          finished = Promise.all(entrance.map((animation) => animation.finished));
        },
      };
      const store = create({ ...options, when: false }) as RevealStore;
      bindLikeAFramework(store, target, value);
      expect(hold(value === "hidden" ? target : target.firstElementChild!)).toBeDefined();
      store.setOptions({ ...options, when: true });
      expect(entrance.length).toBeGreaterThan(0);
      expect(entrance.some((animation) => animation instanceof CSSAnimation)).toBe(false);
      await expect(finished).resolves.toBeDefined();
    },
  );

  it("owns the animation of hidden markup until the reveal, also after the hold", async () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      `<style id="author-css">@keyframes pulse { to { scale: 1.1 } } .pulse { animation: pulse 1s infinite }</style>`,
    );
    document.body.innerHTML = `<div id="target" class="pulse" data-awesome-reveal="hidden">a</div>`;
    const target = document.getElementById("target")!;
    const names = () =>
      target.getAnimations().map((animation) => (animation as CSSAnimation).animationName);
    expect(names()).toEqual(["awesome-reveal-hold"]);
    hold(target)!.finish();
    expect(names()).toEqual([]);
    bind(createReveal({ when: true, duration: 1 }), target, "hidden");
    expect(names()).toContain("pulse");
  });

  describe("focus", () => {
    let target: HTMLElement;
    beforeEach(() => {
      document.body.innerHTML = `<div style="height: 150vh"></div><div id="target"><a href="#">a</a><a href="#">b</a><a href="#">c</a></div><div style="height: 150vh"></div>`;
      scrollTo(0, 0);
      target = document.getElementById("target")!;
    });
    const last = () => target.lastElementChild as HTMLElement;
    function bindStore(options: CascadeOptions, cascade = false) {
      target.setAttribute("data-awesome-reveal", cascade ? "cascade" : "hidden");
      const store = cascade ? createCascade(options) : createReveal(options);
      bind(store as RevealStore, target, cascade ? "cascade" : "hidden");
      return store;
    }
    function expectShown(...elements: Element[]) {
      for (const element of elements) {
        expect(opacity(element)).toBe("1");
        expect(element.getAnimations()).toEqual([]);
      }
    }

    it.each([
      ["a long delay", { delay: 60_000 }],
      ["no delay", { duration: 60_000 }],
      ["native keyframes", { keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: 60_000 }],
    ])("shows a waiting element at once with %s", async (_, options: CascadeOptions) => {
      const onReveal = vi.fn();
      bindStore({ ...options, onReveal });
      expect(opacity(target)).toBe("0");
      last().focus();
      expectShown(target);
      expect(onReveal.mock.calls).toEqual([[target]]);
      await settle();
      expectShown(target);
    });

    it("shows all the children of a cascade at once from a later child", () => {
      bindStore({ duration: 60_000, interval: 10_000 }, true);
      expect(opacity(last())).toBe("0");
      last().focus();
      expectShown(...target.children);
    });

    it("shows server markup that has focus before the attach", () => {
      target.setAttribute("data-awesome-reveal", "hidden");
      last().focus();
      expect(opacity(target)).toBe("1");
      bindStore({ delay: 60_000 });
      expectShown(target);
    });

    it("shows all the children of cascade server markup that has focus before the attach", () => {
      target.setAttribute("data-awesome-reveal", "cascade");
      last().focus();
      for (const child of target.children) expect(opacity(child)).toBe("1");
    });

    it("keeps the hold time when focus leaves server markup", () => {
      target.setAttribute("data-awesome-reveal", "hidden");
      last().focus();
      last().blur();
      expect(opacity(target)).toBe("0");
      hold(target)!.finish();
      last().focus();
      last().blur();
      expect(opacity(target)).toBe("1");
    });

    it("keeps the element hidden with when: false", async () => {
      bindStore({ when: false });
      last().focus();
      await settle();
      expect(opacity(target)).toBe("0");
    });

    it("stops listening at the detach", () => {
      const listen = vi.spyOn(target, "addEventListener");
      const unlisten = vi.spyOn(target, "removeEventListener");
      bindStore({}).attach(null);
      expect(listen).toHaveBeenCalledWith("focusin", expect.any(Function));
      expect(unlisten.mock.calls).toEqual(listen.mock.calls);
    });
  });

  // WebKit does not Tab to buttons and links by default, so the tests use inputs.
  describe("keyboard", () => {
    // WebKit scrolls to a focused element after a rendering update, so a Tab can scroll the next test.
    afterEach(settle);
    beforeEach(() => {
      document.body.innerHTML = `<input id="before"><div style="height: 150vh"></div><div id="target" data-awesome-reveal="hidden"><input id="field"></div><div style="height: 150vh"></div>`;
      scrollTo(0, 0);
    });

    it("Tab focuses a transparent control while when is false", async () => {
      const target = document.getElementById("target")!;
      bind(createReveal({ when: false }), target, "hidden");
      document.getElementById("before")!.focus();
      await userEvent.tab();
      expect(document.activeElement?.id).toBe("field");
      await settle();
      expect(opacity(target)).toBe("0");
    });

    it("Tab reveals the element at once after when: null", async () => {
      const target = document.getElementById("target")!;
      const store = createReveal({ when: false, duration: 60_000 });
      bind(store, target, "hidden");
      store.setOptions({ when: null, duration: 60_000 });
      await settle();
      expect(opacity(target)).toBe("0");
      document.getElementById("before")!.focus();
      await userEvent.tab();
      expect(document.activeElement?.id).toBe("field");
      expect(opacity(target)).toBe("1");
      expect(target.getAnimations()).toEqual([]);
    });
  });
});
