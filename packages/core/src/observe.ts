import { report } from "./report.js";
import type { RevealOptions } from "./types.js";

type Size = Pick<DOMRectReadOnly, "width" | "height">;
type Entry = Pick<IntersectionObserverEntry, "isIntersecting" | "intersectionRatio"> & {
  rootBounds: Size | null;
  boundingClientRect: Size;
};

// The viewport is the largest root, so an element that cannot reach the threshold in it reveals at its entry.
// In a smaller scroll container, the reveal at the exit stays the fallback.
// A cross-origin frame gets no root bounds, and its own viewport is the largest area that it can show.
function reachable({ rootBounds, boundingClientRect: box }: Entry, minimum: number) {
  const root = rootBounds ?? { width: innerWidth, height: innerHeight };
  return Math.min(1, root.width / box.width) * Math.min(1, root.height / box.height) >= minimum;
}

export function classify(entry: Entry, minimum: number, seen: boolean): "seen" | "enter" | "wait" {
  // An element that leaves before it reaches the threshold, such as one in a small scroll container, must not stay hidden.
  if (!entry.isIntersecting) return seen ? "enter" : "wait";
  return entry.intersectionRatio < minimum && reachable(entry, minimum) ? "seen" : "enter";
}

// An entrance must not hide a focused control during its delay or its transparent start.
export const focused = (element: Element) => element.matches(":focus-within");

// The browser validates the threshold. Without a working IntersectionObserver, the element reveals immediately.
export function observe(
  element: Element,
  options: Pick<RevealOptions, "threshold">,
  onEnter: () => void,
): () => void {
  let observer: IntersectionObserver | undefined;
  const disconnect = () => {
    observer?.disconnect();
    observer = undefined;
    element.removeEventListener("focusin", enter);
  };
  const enter = () => {
    disconnect();
    onEnter();
  };
  if (typeof IntersectionObserver === "undefined") {
    onEnter();
    return disconnect;
  }
  const minimum = options.threshold ?? 0;
  let seen = false;
  try {
    observer = new IntersectionObserver(
      (entries) => {
        // A fast scroll can deliver the entry below the threshold and the exit in one report.
        for (const entry of entries) {
          if (!observer) return;
          const result = classify(entry, minimum, seen);
          if (result === "enter") enter();
          else seen ||= result === "seen";
        }
      },
      { threshold: [0, minimum] },
    );
    observer.observe(element);
    // Focus reveals the element. Focus can come before the observation, such as in server markup before hydration.
    element.addEventListener("focusin", enter);
    if (focused(element)) enter();
  } catch (error) {
    disconnect();
    report(error);
    onEnter();
  }
  return disconnect;
}
