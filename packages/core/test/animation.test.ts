import { cascadeInterval, entrance } from "../src/animation";
import {
  defaultKeyframes,
  easing,
  fadeKeyframes,
} from "@awesome-reveal/test-utils/entrance-fixtures";

describe("entrance", () => {
  it.each([
    ["left", "-24px 0px"],
    ["right", "24px 0px"],
    ["top", "0px -24px"],
    ["bottom", "0px 24px"],
  ] as const)("generates the %s entrance", (from, translate) => {
    expect(entrance({ from })).toEqual([
      { offset: 0, easing, opacity: 0, translate: "0px 0px" },
      { offset: 1e-6, easing, translate },
      { offset: 1, opacity: 1, translate: "0px 0px" },
    ]);
  });

  it("uses the bottom entrance by default", () => {
    expect(entrance({})).toEqual(defaultKeyframes);
  });

  it.each([
    [{ opacity: 0 }, fadeKeyframes],
    [
      { scale: 0.9 },
      [
        { offset: 0, easing, scale: 0.9 },
        { offset: 1, scale: 1 },
      ],
    ],
    [{}, [{ offset: 0, easing }, { offset: 1 }]],
  ])("uses exactly the custom start state %j", (from, keyframes) => {
    expect(entrance({ from })).toEqual(keyframes);
  });

  it("converts numeric and string CSS values", () => {
    expect(
      entrance({ from: { opacity: 0.3, x: -16, y: "-100%", scale: 0.8, rotate: -5, blur: 8 } }),
    ).toEqual([
      {
        offset: 0,
        easing,
        opacity: 0.3,
        translate: "-16px -100%",
        scale: 0.8,
        rotate: "-5deg",
        filter: "blur(8px)",
      },
      {
        offset: 1,
        opacity: 1,
        translate: "0px 0px",
        scale: 1,
        rotate: "0deg",
        filter: "blur(0px)",
      },
    ]);
    expect(entrance({ from: { x: "2rem", rotate: "0.5turn", blur: "0.5rem" } })).toMatchObject([
      { translate: "2rem 0px", rotate: "0.5turn", filter: "blur(0.5rem)" },
      { translate: "0px 0px", rotate: "0deg", filter: "blur(0px)" },
    ]);
  });

  it("returns native keyframes unchanged", () => {
    const keyframes: Keyframe[] = [
      { opacity: 0, transform: "scale(.8)", easing: "ease-in", offset: 0, composite: "replace" },
      { opacity: 1, transform: "scale(1)" },
    ];
    expect(entrance({ keyframes })).toBe(keyframes);
  });
});

describe("cascadeInterval", () => {
  it("is 80 by default, and keeps an interval of 0", () => {
    expect(cascadeInterval({})).toBe(80);
    expect(cascadeInterval({ interval: 0 })).toBe(0);
    expect(cascadeInterval({ interval: 120 })).toBe(120);
  });
});
