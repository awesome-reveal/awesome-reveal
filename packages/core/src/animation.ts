import { report } from "./report.js";
import type { CascadeOptions, RevealOptions, StartState } from "./types.js";

const unit = (value: number | string, suffix: string) =>
  typeof value === "number" ? `${value}${suffix}` : value;

export function entrance(options: RevealOptions): Keyframe[] {
  if (options.keyframes) return options.keyframes;
  const from = options.from ?? "bottom";
  const state: StartState =
    typeof from === "object"
      ? from
      : {
          opacity: 0,
          ...(from === "left" || from === "right"
            ? { x: from === "left" ? -24 : 24 }
            : { y: from === "top" ? -24 : 24 }),
        };
  const { opacity, x, y, scale, rotate, blur } = state;
  const easing = "cubic-bezier(0.22, 1, 0.36, 1)";
  const move: Keyframe = {};
  const rest: Keyframe = {};
  if (x !== undefined || y !== undefined) {
    move.translate = `${unit(x ?? 0, "px")} ${unit(y ?? 0, "px")}`;
    rest.translate = "0px 0px";
  }
  if (scale !== undefined) {
    move.scale = scale;
    rest.scale = 1;
  }
  if (rotate !== undefined) {
    move.rotate = unit(rotate, "deg");
    rest.rotate = "0deg";
  }
  if (blur !== undefined) {
    move.filter = `blur(${unit(blur, "px")})`;
    rest.filter = "blur(0px)";
  }
  // Chromium composites an effect only when no keyframe is additive, so the entrance ends at neutral values.
  const start: Keyframe = { offset: 0, easing };
  const end: Keyframe = { offset: 1, ...rest };
  if (opacity !== undefined) {
    start.opacity = opacity;
    end.opacity = 1;
  }
  if (!Object.keys(move).length) return [start, end];
  // The observer measures the transformed box, and an offset can put it outside a clipping ancestor permanently.
  // A hidden start waits at rest and moves only when it plays, while it is still transparent.
  if (opacity === 0) return [{ ...start, ...rest }, { offset: 1e-6, easing, ...move }, end];
  return [{ ...start, ...move }, end];
}

export const motionPreference = () =>
  typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : undefined;

// A paused native effect holds any start keyframes, so the code does not copy CSS properties to the element.
function motion(element: Element, options: RevealOptions, delay: number) {
  let animation: Animation | undefined;
  try {
    animation = element.animate?.(entrance(options), {
      duration: options.duration ?? 600,
      delay,
      fill: "backwards",
    });
    animation?.pause();
    if (animation) animation.currentTime = 0;
  } catch (error) {
    // The browser can reject native keyframes or timing. Then the content must not stay hidden.
    report(error);
    animation?.cancel();
    animation = undefined;
  }
  return animation;
}

interface Motions {
  play(): void;
  print(printing: boolean): void;
  dispose(keep?: boolean): void;
}

// Core has no print stylesheet, and the print rule of an adapter stops at the reveal, so print moves each effect past its fill.
const following = new Set<Motions>();
const onPrint = (event: Event) => {
  for (const group of following) group.print(event.type === "beforeprint");
};
function listenPrint(method: "addEventListener" | "removeEventListener") {
  globalThis[method]?.("beforeprint", onPrint);
  globalThis[method]?.("afterprint", onPrint);
}

export const cascadeInterval = (options: CascadeOptions) => options.interval ?? 80;

// Without an interval, the element itself animates.
export function entrances(element: Element, options: RevealOptions, interval?: number) {
  const targets = interval === undefined ? [element] : Array.from(element.children);
  const delay = options.delay ?? 0;
  return targets.map((target, index) => motion(target, options, delay + index * (interval ?? 0)));
}

export function motions(element: Element, animations: (Animation | undefined)[]): Motions {
  const finish = () => {
    for (const animation of animations) if (animation?.playState === "running") animation.finish();
  };
  const group: Motions = {
    play() {
      for (const animation of animations)
        // A waiting animation that page code finished or cancelled leaves the element at rest, so it does not play.
        if (animation?.playState === "paused") animation.play();
    },
    // At its end time, a waiting effect is past its backwards fill, so the element prints at rest.
    // A running animation in its delay has no fill without "backwards", and keeps its time.
    print(printing) {
      for (const animation of animations) {
        if (animation?.playState === "paused")
          animation.currentTime = printing
            ? (animation.effect?.getComputedTiming().endTime ?? 0)
            : 0;
        animation?.effect?.updateTiming({ fill: printing ? "none" : "backwards" });
      }
    },
    // A settled group passes keep: cancel() on a finished animation fires a cancel event and makes it idle.
    dispose(keep) {
      if (!keep) for (const animation of animations) animation?.cancel();
      element.removeEventListener("focusin", finish);
      animations = [];
      following.delete(group);
      if (!following.size) listenPrint("removeEventListener");
    },
  };
  element.addEventListener("focusin", finish);
  following.add(group);
  listenPrint("addEventListener");
  return group;
}
