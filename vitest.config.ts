import { fileURLToPath } from "node:url";

import { playwright } from "@vitest/browser-playwright";
import vue from "@vitejs/plugin-vue";
import { coverageConfigDefaults, defineConfig } from "vitest/config";

import { emulateReducedMotion } from "./packages/test-utils/src/commands.ts";

function aliases(entries: [string, string][]) {
  return entries.map(([find, source]) => ({
    find: new RegExp(`^${find}$`),
    replacement: fileURLToPath(new URL(source, import.meta.url)),
  }));
}

const testUtils = aliases([["@awesome-reveal/test-utils/(.+)", "packages/test-utils/src/$1.ts"]]);

// Unit tests run against the sources of the other workspace packages, so no build is necessary first.
// The :package projects test dist, so they get only the test-utils alias.
function sourcesFor(css: "react" | "vue") {
  return {
    alias: [
      ...aliases([
        ["@awesome-reveal/core", "packages/core/src/index.ts"],
        ["@awesome-reveal/core/adapter", "packages/core/src/adapter.ts"],
        ["#reveal-style.css", `packages/${css}/src/reveal.css`],
      ]),
      ...testUtils,
    ],
  };
}
const sources = sourcesFor("react");

// A function, because Vitest writes a name into each browser instance, so two projects cannot share them.
const browserTest = () => ({
  css: { include: [/reveal\.css$/] },
  retry: process.env.CI ? 2 : 0,
  browser: {
    enabled: true,
    headless: true,
    provider: playwright(),
    instances: (["chromium", "firefox", "webkit"] as const)
      .filter(
        (browser) =>
          !process.env.REVEAL_BROWSERS || process.env.REVEAL_BROWSERS.split(",").includes(browser),
      )
      .map((browser) => ({ browser })),
    // The tests scroll by viewport heights.
    viewport: { width: 1280, height: 720 },
    trace: "on-first-retry" as const,
    commands: { emulateReducedMotion },
  },
});

const coverageThreshold = { lines: 90, functions: 90, branches: 85, statements: 90 };

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "istanbul",
      include: ["**/src/**"],
      exclude: ["**/test-utils/**", "**/test/fixtures/**"],
      // CI turns json-summary into the coverage table of the GitHub job summary.
      reporter: [...coverageConfigDefaults.reporter, "json-summary"],
      // Each package must reach the threshold, so that a weak package cannot hide in the total.
      thresholds: Object.fromEntries(
        ["astro", "core", "react", "vue"].map((name) => [
          `packages/${name}/src/**`,
          coverageThreshold,
        ]),
      ),
    },
    projects: [
      {
        root: "packages/core",
        resolve: { alias: testUtils },
        test: {
          name: "core:unit",
          typecheck: {
            enabled: true,
            tsconfig: "./test/tsconfig.json",
            include: ["test/types.test-d.ts"],
          },
          environment: "node",
          include: ["test/**/*.test.ts"],
          exclude: ["test/package/**", "test/browser/**"],
        },
      },
      {
        root: "packages/core",
        resolve: { alias: testUtils },
        test: {
          name: "core:browser",
          include: ["test/browser/**/*.test.ts"],
          ...browserTest(),
          setupFiles: ["./test/setup/browser.ts"],
        },
      },
      {
        root: "packages/core",
        resolve: { alias: testUtils },
        test: {
          name: "core:package",
          environment: "node",
          include: ["test/package/**/*.test.ts"],
        },
      },
      {
        root: "packages/react",
        resolve: sources,
        test: {
          name: "react:unit",
          environment: "jsdom",
          setupFiles: ["./test/setup/console.ts", "./test/setup/dom.ts"],
          include: ["test/**/*.test.{ts,tsx}"],
          exclude: ["test/package/**", "test/browser/**", "test/ssr.test.tsx"],
          typecheck: {
            enabled: true,
            tsconfig: "./test/tsconfig.json",
            include: ["test/types/**/*.test-d.{ts,tsx}"],
          },
        },
      },
      {
        root: "packages/react",
        resolve: sourcesFor("react"),
        test: {
          name: "react:browser",
          include: ["test/browser/**/*.test.{ts,tsx}"],
          ...browserTest(),
          setupFiles: ["./test/setup/console.ts", "./test/setup/browser.ts"],
        },
      },
      {
        root: "packages/react",
        resolve: sources,
        test: {
          name: "react:ssr",
          environment: "node",
          setupFiles: ["./test/setup/console.ts"],
          include: ["test/ssr.test.tsx"],
        },
      },
      {
        root: "packages/react",
        resolve: { alias: testUtils },
        test: {
          name: "react:package",
          environment: "node",
          setupFiles: ["./test/setup/console.ts"],
          include: ["test/package/**/*.test.ts"],
        },
      },
      {
        root: "packages/vue",
        plugins: [vue()],
        resolve: sources,
        test: {
          name: "vue:unit",
          environment: "jsdom",
          setupFiles: ["./test/setup/console.ts", "./test/setup/dom.ts"],
          include: ["test/**/*.test.ts"],
          exclude: ["test/package/**", "test/ssr.test.ts"],
          typecheck: {
            enabled: true,
            // vue-tsc also checks the templates of the .vue files that the tsconfig includes.
            checker: "vue-tsc",
            tsconfig: "./test/tsconfig.json",
            include: ["test/types/**/*.test-d.ts"],
          },
        },
      },
      {
        root: "packages/vue",
        plugins: [vue()],
        resolve: sources,
        test: {
          name: "vue:ssr",
          environment: "node",
          setupFiles: ["./test/setup/console.ts"],
          include: ["test/ssr.test.ts"],
        },
      },
      {
        root: "packages/vue",
        resolve: { alias: testUtils },
        test: {
          name: "vue:package",
          environment: "node",
          setupFiles: ["./test/setup/console.ts"],
          include: ["test/package/**/*.test.ts"],
        },
      },
      {
        root: "packages/astro",
        resolve: sources,
        test: {
          name: "astro:unit",
          environment: "jsdom",
          setupFiles: ["./test/setup/console.ts", "./test/setup/dom.ts"],
          include: ["test/**/*.test.ts"],
          exclude: ["test/package/**", "test/e2e/**", "test/ssr.test.ts", "test/build.test.ts"],
          typecheck: {
            enabled: true,
            tsconfig: "./test/tsconfig.json",
            include: ["test/types/**/*.test-d.ts"],
          },
        },
      },
      "packages/astro/vitest.config.ts",
      {
        root: "packages/astro",
        test: {
          name: "astro:browser",
          environment: "node",
          include: ["test/e2e/**/*.test.ts"],
          globalSetup: ["./test/e2e/setup.ts"],
          retry: process.env.CI ? 2 : 0,
          hookTimeout: 60_000,
        },
      },
      {
        root: "packages/astro",
        resolve: { alias: testUtils },
        test: {
          name: "astro:package",
          environment: "node",
          setupFiles: ["./test/setup/console.ts"],
          include: ["test/package/**/*.test.ts"],
        },
      },
      {
        root: "packages/react-awesome-reveal",
        test: {
          name: "react-awesome-reveal:package",
          environment: "node",
          include: ["test/package/**/*.test.ts"],
        },
      },
    ],
  },
});
