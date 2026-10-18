export interface AnimateCall {
  element: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  animation: Animation;
}

export function trackAnimations() {
  const animate = Element.prototype.animate;
  const spy = vi.spyOn(Element.prototype, "animate");
  return {
    calls(): AnimateCall[] {
      return spy.mock.results.flatMap((result, index) =>
        result.type === "return"
          ? [
              {
                element: spy.mock.contexts[index] as Element,
                keyframes: spy.mock.calls[index]![0] as Keyframe[],
                options: spy.mock.calls[index]![1] as KeyframeAnimationOptions,
                animation: result.value,
              },
            ]
          : [],
      );
    },
    active(): Animation[] {
      return this.calls()
        .map((call) => call.animation)
        .filter((animation) => animation.playState !== "idle");
    },
    rejectEasing(easing: string, error: Error) {
      spy.mockImplementation(function (this: Element, ...args) {
        const [keyframes, options] = args as [Keyframe[], KeyframeAnimationOptions | undefined];
        if ([...keyframes, options].some((value) => value?.easing === easing)) throw error;
        return animate.apply(this, args);
      });
    },
  };
}

export function trackObservers() {
  const { observe, disconnect } = IntersectionObserver.prototype;
  const observed = new Map<IntersectionObserver, Set<Element>>();
  vi.spyOn(IntersectionObserver.prototype, "observe").mockImplementation(function (
    this: IntersectionObserver,
    element,
  ) {
    observed.set(this, (observed.get(this) ?? new Set()).add(element));
    return observe.call(this, element);
  });
  vi.spyOn(IntersectionObserver.prototype, "disconnect").mockImplementation(function (
    this: IntersectionObserver,
  ) {
    observed.delete(this);
    return disconnect.call(this);
  });
  return {
    observerOf(element: Element): IntersectionObserver | undefined {
      return [...observed].find(([, elements]) => elements.has(element))?.[0];
    },
    live(): IntersectionObserver[] {
      return [...observed.keys()];
    },
  };
}

/**
 * Fault injection: removes `Element.prototype.animate`. The `vi.spyOn` makes `vi.restoreAllMocks()`
 * restore it.
 */
export function withoutAnimate(): void {
  vi.spyOn(Element.prototype, "animate");
  Object.defineProperty(Element.prototype, "animate", { value: undefined, configurable: true });
}
