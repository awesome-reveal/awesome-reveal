import { bundleFixture } from "@awesome-reveal/test-utils/bundle";

it.concurrent.each([
  {
    entry: "reveal.js",
    animationExports: ["entrance", "entrances", "motionPreference", "motions"],
    bytes: 3190,
    gzip: 1550,
  },
  {
    entry: "both.js",
    animationExports: ["cascadeInterval", "entrance", "entrances", "motionPreference", "motions"],
    bytes: 3260,
    gzip: 1580,
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
