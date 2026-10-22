import { cascadeInterval, entrances, motionPreference, motions } from "./animation.js";
import { focused, observe } from "./observe.js";
import type { CascadeOptions, RevealHandle, RevealOptions, RevealTarget } from "./types.js";

function resolveTargets(target: RevealTarget): Element[] {
  if (typeof target === "string")
    return typeof document === "undefined" ? [] : Array.from(document.querySelectorAll(target));
  return "nodeType" in target ? [target] : Array.from(target);
}

function start(target: RevealTarget, options: RevealOptions, interval?: number): RevealHandle {
  const releases = new Set<(keep?: boolean) => void>();
  const preference = motionPreference();
  const dispose = () => {
    for (const release of releases) release();
  };
  const onPreference = () => {
    if (preference?.matches) dispose();
  };
  if (preference?.matches) return { dispose };
  for (const element of new Set(resolveTargets(target))) {
    const animations = entrances(element, options, interval);
    const group = motions(element, animations);
    let disconnect: (() => void) | undefined;
    const release = (keep?: boolean) => {
      if (!releases.delete(release)) return;
      disconnect?.();
      group.dispose(keep);
      if (!releases.size) preference?.removeEventListener?.("change", onPreference);
    };
    releases.add(release);
    disconnect = observe(element, options, () => (focused(element) ? release() : group.play()));
    Promise.allSettled(animations.map((animation) => animation?.finished)).then(() =>
      release(true),
    );
  }
  if (releases.size) preference?.addEventListener?.("change", onPreference);
  return { dispose };
}

/** Animates each target element when it enters the viewport. It needs no stylesheet. */
export function reveal(target: RevealTarget, options: RevealOptions = {}): RevealHandle {
  return start(target, options);
}

/** Animates the direct element children of each container in sequence when the container enters the viewport. */
export function cascade(target: RevealTarget, options: CascadeOptions = {}): RevealHandle {
  return start(target, options, cascadeInterval(options));
}
