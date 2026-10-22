import { bundleFixture } from "@awesome-reveal/test-utils/bundle";

const bundle = (fixture: string) =>
  bundleFixture(new URL(`fixtures/${fixture}`, import.meta.url), {
    resolvePackage: "@awesome-reveal/vue",
    external: ["vue"],
  });

describe("consumer bundle", () => {
  it("keeps only the modules and exports that it imports", async () => {
    const { keptExports, bytes, css } = await bundle("reveal-only.js");

    expect(keptExports["core/dist/adapter.js"]).toContain("createReveal");
    expect(css).toBeGreaterThan(0);
    expect(bytes + css).toBeLessThan(6550);
  });

  it("keeps no Reveal component for the directive alone", async () => {
    const { keptExports, bytes, css } = await bundle("directive-only.js");

    expect(keptExports["core/dist/adapter.js"]).toContain("createReveal");
    expect(css).toBeGreaterThan(0);
    expect(bytes + css).toBeLessThan(6175);
    expect(keptExports).not.toHaveProperty("vue/dist/Reveal.js");
  });
});
