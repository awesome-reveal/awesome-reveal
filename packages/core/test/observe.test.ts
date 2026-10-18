import { classify } from "../src/observe";

const root = { width: 1280, height: 720 };
const box = { width: 100, height: 100 };

function entry(
  intersectionRatio: number,
  overrides: Partial<Parameters<typeof classify>[0]> = {},
): Parameters<typeof classify>[0] {
  return {
    isIntersecting: intersectionRatio > 0,
    intersectionRatio,
    rootBounds: root,
    boundingClientRect: box,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("classify", () => {
  it("waits below the threshold when the element can reach it", () => {
    expect(classify(entry(0.2), 0.5, false)).toBe("seen");
  });

  it("enters at the threshold", () => {
    expect(classify(entry(0.5), 0.5, false)).toBe("enter");
  });

  it("enters at the entry when the element cannot reach the threshold in the root", () => {
    const tall = entry(0.2, { boundingClientRect: { width: 100, height: 2000 } });
    expect(classify(tall, 0.5, false)).toBe("enter");
  });

  it("enters at an exit after it saw the element", () => {
    const exit = entry(0, { isIntersecting: false });
    expect(classify(exit, 0.5, true)).toBe("enter");
    expect(classify(exit, 0.5, false)).toBe("wait");
  });

  it.each([
    [2000, "enter"],
    [1000, "seen"],
  ])(
    "uses its own viewport in a cross-origin frame with no root bounds: height %d gives %s",
    (height, result) => {
      vi.stubGlobal("innerWidth", 1000);
      vi.stubGlobal("innerHeight", 500);
      const framed = entry(0.1, { rootBounds: null, boundingClientRect: { width: 500, height } });
      expect(classify(framed, 0.5, false)).toBe(result);
    },
  );

  it.each([
    [0.3, 0],
    [0.6, 0],
  ])("reads each entry of one report: %d, then %d", (...ratios) => {
    let seen = false;
    const results = ratios.map((ratio) => {
      const result = classify(entry(ratio), 0.5, seen);
      if (result === "seen") seen = true;
      return result;
    });
    expect(results.filter((result) => result === "enter")).toHaveLength(1);
  });
});
