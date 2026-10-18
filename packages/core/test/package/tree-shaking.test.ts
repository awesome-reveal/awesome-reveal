import { bundleFixture } from "@awesome-reveal/test-utils/bundle";

it.concurrent.each([
  {
    entry: "reveal.js",
    animationExports: ["entrance", "entrances", "motionPreference", "motions"],
    bytes: 4025,
    gzip: 1800,
  },
  {
    entry: "both.js",
    animationExports: ["cascadeInterval", "entrance", "entrances", "motionPreference", "motions"],
    bytes: 4125,
    gzip: 1830,
  },
])(
  "keeps only the imperative modules for $entry",
  async ({ entry, animationExports, bytes, gzip }) => {
    const result = await bundleFixture(new URL(`fixtures/${entry}`, import.meta.url));
    expect(Object.keys(result.keptExports).sort()).toEqual([
      "core/dist/animation.js",
      "core/dist/observe.js",
      "core/dist/report.js",
      "core/dist/reveal.js",
    ]);
    expect(result.keptExports["core/dist/animation.js"]!.slice().sort()).toEqual(animationExports);
    expect(result.bytes).toBeLessThan(bytes);
    expect(result.gzip).toBeLessThan(gzip);
  },
);
