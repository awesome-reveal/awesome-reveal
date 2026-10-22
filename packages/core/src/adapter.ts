import { cascadeInterval, entrances, motionPreference, motions } from "./animation.js";
import { focused, observe } from "./observe.js";
import { report } from "./report.js";
import type {
  CascadeOptions as CoreCascadeOptions,
  RevealOptions as CoreRevealOptions,
} from "./types.js";

/** Configures a declarative entrance and optional manual control. */
export type RevealOptions = CoreRevealOptions & {
  /** Controls the entrance manually. `true` reveals, `false` resets the entrance, and no value or `null` lets the viewport decide. A change from `true` to `null` keeps the element revealed. It does not show or hide content. With `false`, the element is transparent, but screen readers read it and the keyboard can focus its controls. To hide content, use `hidden`, or do not render it. `inert` does not hide the element. It only blocks focus, clicks and assistive technology. Reduced motion reveals the element also when `when` is `false`. */
  when?: boolean | null;
  /** Runs one time for each reveal, also when no entrance plays, such as with reduced motion or focus. */
  onReveal?: (element: Element) => void;
};

/** Configures a declarative cascade of the direct element children and optional manual control. */
export type CascadeOptions = RevealOptions & Pick<CoreCascadeOptions, "interval">;

/** Binds a declarative reveal to a framework rendering lifecycle. */
export interface RevealStore<Options extends RevealOptions = RevealOptions> {
  /**
   * Tells if the element is revealed. It is `false` at creation, also with `when: true`, so that a
   * server renderer can read it.
   */
  readonly revealed: boolean;
  /**
   * Calls `listener` when `revealed` changes. The listener must hide the element before the next
   * frame. At the reveal, the store removes `data-awesome-reveal` itself, before `onReveal`. There is
   * one listener: a new call replaces it.
   * @returns A function that removes the listener.
   */
  subscribe(listener: (revealed: boolean) => void): () => void;
  /**
   * Observes and animates the element, and marks it with `data-awesome-reveal-attached`, so that
   * the stylesheet hides it until it reveals. A new element keeps the state and does not play the
   * entrance again. `null` stops the observation and cancels the entrance. If `null` cancelled a
   * running entrance and you attach the same element again right after, its entrance plays again.
   */
  attach(element: Element | null): void;
  /**
   * Replaces the options. A change of `when` or `threshold` applies immediately. The other options
   * apply at the next reveal. The entrance plays on the attached element, so when the element and
   * `when` change together, attach the new element first.
   */
  setOptions(options: Options): void;
}

/** Gives the attributes that hide framework content before hydration. */
export const hiddenAttributes = { "data-awesome-reveal": "hidden" } as const;

/** Gives the attributes that hide the direct children of a cascade before hydration. */
export const cascadeHiddenAttributes = { "data-awesome-reveal": "cascade" } as const;

const restarts = ["when", "threshold"] as const;

// A cascade reads the children here, so that children that render after `attach()` also play.
// The cancel function tells if the entrance was still running.
function play(element: Element, options: CoreRevealOptions, interval?: number): () => boolean {
  let animations = entrances(element, options, interval);
  const group = motions(animations);
  group.play();
  // Keeps no removed cascade child. Then cancel() returns false, so the entrance does not replay.
  Promise.allSettled(animations.map((animation) => animation?.finished)).then(() => {
    animations = [];
    group.dispose(true);
  });
  return () => {
    const running = animations.some((animation) => animation?.playState === "running");
    animations = [];
    group.dispose();
    return running;
  };
}

// The stylesheet holds an element with this marker until it reveals. Without it, the hold ends after a few seconds.
const attached = "data-awesome-reveal-attached";
const hidden = "data-awesome-reveal";

function createStore<Options extends CascadeOptions>(
  options: Options,
  cascade: boolean,
): RevealStore<Options> {
  // The store keeps a copy, so a caller that mutates the options object and passes it again still restarts the observer.
  let current = { ...options };
  let element: Element | null = null;
  let detached: Element | null = null;
  let inView = false;
  let revealed = false;
  let played = false;
  // A replay on the same element, such as in React StrictMode, is not a new reveal.
  let notified = false;
  let listener: (revealed: boolean) => void = () => {};
  let cancel = (): boolean => false;
  let disconnect = () => {};
  const preference = motionPreference();
  function onPreference() {
    if (preference?.matches && element) {
      cancel();
      disconnect();
      set((inView = true));
    }
  }

  function set(next: boolean) {
    if (next !== revealed) {
      revealed = next;
      played = false;
      notified = false;
      cancel();
      listener(next);
    }
    if (revealed && element && !played) {
      played = true;
      // Ends the CSS hold before `onReveal`, so `getAnimations()` in the callback gets only the entrance.
      element.removeAttribute(hidden);
      cancel =
        preference?.matches || focused(element)
          ? () => false
          : play(element, current, cascade ? cascadeInterval(current) : undefined);
      if (!notified) {
        notified = true;
        // A throwing callback must not break the render or the effect that attached the element.
        try {
          current.onReveal?.(element);
        } catch (error) {
          report(error);
        }
      }
    }
  }

  function connect() {
    disconnect();
    disconnect = () => {};
    // `when` on an attached element sets `inView`, so a later `null` or `threshold` keeps its result.
    if (element && current.when != null) inView = current.when;
    if (preference?.matches && element) return set((inView = true));
    if (element && typeof element.animate !== "function") return set((inView = true));
    if (current.when != null) return set(current.when);
    set(inView);
    if (element && !inView) disconnect = observe(element, current, () => set((inView = true)));
  }

  return {
    get revealed() {
      return revealed;
    },
    subscribe(next) {
      listener = next;
      return () => {
        if (listener === next) listener = () => {};
      };
    },
    attach(next) {
      if (next === element) return;
      element?.removeAttribute(attached);
      next?.setAttribute(attached, "");
      preference?.removeEventListener?.("change", onPreference);
      if (next) preference?.addEventListener?.("change", onPreference);
      // The same element that returns immediately after null plays again when `attach(null)`
      // cancelled its entrance before it could finish.
      if (next && next === detached) played = false;
      detached = !cancel() || next ? null : element;
      element = next;
      connect();
    },
    setOptions(next) {
      const previous = current;
      current = { ...next };
      if (restarts.some((key) => (next[key] ?? null) !== (previous[key] ?? null))) connect();
    },
  };
}

/** Creates a reveal binding for an official framework adapter. */
export function createReveal(options: RevealOptions = {}): RevealStore {
  return createStore(options, false);
}

/** Creates a cascade binding for an official framework adapter. It reveals the direct element children in sequence. */
export function createCascade(options: CascadeOptions = {}): RevealStore<CascadeOptions> {
  return createStore(options, true);
}
