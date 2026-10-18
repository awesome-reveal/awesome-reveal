---
name: adding-framework-adapters
description: Adds a framework adapter package (@awesome-reveal/<framework>) to the workspace, with its build, tests, consumer skills, example and release config. Use when you start a new framework adapter, such as Svelte, Solid or Angular.
---

# Add a framework adapter

Use `packages/react` and `packages/vue` as models. Both pass the contract suite and have a hydration test. Core does all the work, and an adapter only binds it to the framework, so that every framework behaves the same.

Copy the steps into your task list, and mark each step when it is done.

Keep the item of the adapter on the plan board, https://github.com/orgs/awesome-reveal/projects/1, in sync with the work. Set its Status to "In Progress" before step 1. Add the PR number to each checklist item that a PR covers, tick the item when the PR merges, and set "Done" when all items are ticked.

1. Create `packages/<framework>` with `package.json`, `tsconfig.json`, `vite.config.ts`, `test/tsconfig.json` and the `test/setup` files. Copy them from `packages/react`, and change these items:
   - `name`, `description`, `keywords` and `repository.directory`.
   - The framework peer dependency and its dev dependencies.
   - The JSX options in `tsconfig.json`, such as `jsxImportSource`. Remove them if the framework has no JSX.

   Keep `"@awesome-reveal/core": "workspace:^"`, and keep `"version"` equal to the other packages. Add the package to the `paths` in `tsconfig.base.json`, so that the example type-checks against the sources.

2. Prefer plain TypeScript sources, such as render functions, when the framework allows it. Then the build needs no compiler plugin, and `vite-plugin-dts` emits the declarations. If the framework needs a compiler plugin, pass it to `defineLibConfig` in `vite.config.ts` as the second argument. Check the declarations and the output format:
   - `vite-plugin-dts` emits declarations for `.vue` files only when `@vue/language-core` is installed.
   - `vite-plugin-dts` cannot emit declarations for `.svelte` files. Svelte libraries use `@sveltejs/package`.
   - Solid libraries also publish uncompiled JSX under a `"solid"` export condition, so that the consumer compiles it for the DOM or the server.
3. Ship the SSR stylesheet in the package, so that in most setups the user imports no CSS. Copy `src/reveal.css` from `packages/react`, pass `revealCss` and `noStyle` to `defineLibConfig`, and set `"sideEffects": ["*.css"]`. Add the `./reveal.css` export, as `packages/react/package.json` does, for the setups that need an explicit import, such as an Astro island. Import the CSS from each module that renders hidden markup, through the `#reveal-style.css` subpath import of `packages/react/package.json`. Its `node` condition resolves to an empty module, so that Node and the server builds of bundlers load no CSS. A component file that the framework compiles, as `Host.astro` is, can import the CSS directly. Copy `src/reveal-style.d.ts` too, because the build type-checks before `dist` has the CSS declarations. Add a `test/browser/stylesheet.test.ts`. It checks that your `reveal.css` equals the React copy. It also checks that the page has a `style` element with the `data-vite-dev-id` of your own copy. Re-export the `Side` and `StartState` types of core from `src/index.ts`.
4. Write the API as a binding on core. Choose the layer for each API, not for the whole adapter, because one adapter can have both kinds:
   - Use `createReveal` from `@awesome-reveal/core/adapter` for each reveal API, and `createCascade` for each cascade API. Give the adapter a reveal API and a cascade API, as the other adapters do. When the framework renders the element, as React and the Vue `<Reveal>` do, render `data-awesome-reveal` from `revealed`. Sometimes the adapter owns the element, and the framework does not render its attributes: directives, actions, attachments and custom elements. Then set `data-awesome-reveal` in the `subscribe` listener when `revealed` becomes `false`, as `v-reveal` and the Astro custom element do. Core removes the attribute at the reveal, before `onReveal`.
   - Do not call `reveal()` or `cascade()` of the root entry. They animate with no SSR state and no `when`, so the server markup and the client state differ.
   - Obey the adapter contract:
     - Take exactly the adapter `RevealOptions` of core, or `CascadeOptions` for a cascade API, with the same names, defaults and `null` meaning. Do not add an option or a default.
     - Let one core object own the observer, the animation and `when`. Do not rebuild that state machine in the adapter.
     - Render `hiddenAttributes` of core on the revealed element while `revealed` is false. A cascade renders `cascadeHiddenAttributes`, and `reveal.css` hides its direct children. Do not write a style: the package `reveal.css` hides the element. The client render must equal the server markup.
     - Do not replay the animation on a new element, such as a changed `as` tag. `attach` keeps the state. A directive that is bound to its element is the only exception.
     - Treat `data-awesome-reveal` and `data-awesome-reveal-attached` as reserved. Do not let the framework render remove `data-awesome-reveal-attached`, which core sets at the attach. Leave the `style` of the user as it is.
     - Pass `onReveal` to core. If the framework has events, emit an event from it, as the Vue `<Reveal>` and the Astro custom element do.
     - Do not defer the entrance, for example with a timer or a frame callback: core starts it in the task of the report, before the next paint.
     - Do not catch the errors of core. It reports the errors of `onReveal`.
5. Render the hidden state in the server markup, so that the element does not show before hydration. Add a hydration test that renders on the server, hydrates in a browser, and fails on a mismatch warning, as `packages/react/test/browser/hydration.test.tsx` and `packages/vue/test/browser/hydration.test.ts` do. An attribute that only the server renders can cause a mismatch.
6. Add the Vitest projects to `vitest.config.ts`: `<framework>:unit`, `<framework>:browser`, `<framework>:package`, and `<framework>:ssr` when the framework renders on a server.
   - Give the `sources` alias to `:unit` and `:ssr`, and only the `testUtils` alias to `:package`, because `:package` tests `dist`.
   - Give `:browser` the options `...browserTest()` and the aliases of `sourcesFor()`. Extend `sourcesFor()` for the `reveal.css` of the new package. Write the parentheses of `browserTest()`: each project needs its own browser instances, because Vitest writes a name into each instance. The function also sets `unstubGlobals: true`.
   - Put the bare imports of the framework and of its `vitest-browser-*` package in `optimizeDeps.include` of `:browser`. Without the list, a run with a warm cache can optimize the dependencies again in the middle of the run. Vite then reloads the page, and the page loads two copies of the framework.
   - Exclude `test/browser/**` from `:unit`. Run the `:unit`, `:ssr` and `:browser` projects in the `framework` job of `ci.yml`, as step 12 describes.
   - Add the package to the coverage thresholds.
   - Add a `typecheck` block to `:unit`, as `react:unit` has, so that `pnpm test` runs the type tests. If `tsc` cannot read the component files, set the `checker` that can, such as `vue-tsc` for Vue.
   - If the tests compile component files, add the compiler plugin to the project `plugins`, and to the root `devDependencies`, because the root `vitest.config.ts` imports it.
   - If the components have their own file extension, such as `.vue`, make sure that `.lintstagedrc.mjs` passes it to `vitest related`.
7. Write the tests in `test/browser/` with the helpers of `@awesome-reveal/test-utils`, and add `test/browser/contract.test.ts` with a harness for `describeContract` of each reveal API and for `describeCascadeContract` of each cascade API. Run `describeSSRContract` from the SSR test, with `"cascade"` as the hidden value for a cascade API, as the React and Vue packages do. A scenario that fails is a bug of the adapter. Do not skip it.
8. Port the tests of `packages/react/test/package`: the dist files and exports, the server markup, `describeDocs`, and the tree-shaking fixtures with size limits, through `bundleFixture()` of `@awesome-reveal/test-utils/bundle`. Drop the `"use client"` test if the framework has no Server Components. `describeDocs` type-checks only the `ts` and `tsx` fences of the consumer skills and of the README. Put the setup and native keyframes examples in these fences, as whole modules with their imports.
9. Add the consumer skills in `packages/<framework>/skills/<name>/SKILL.md`, and add `skills` to `files`. Port `adding-reveal-animations` from the React package.
10. Add `examples/<framework>`, with the sections of `examples/react`.
11. Add the package to `release-please-config.json`, with `"component"` set to the package name, and to `linked-versions`. Without `"component"`, release-please drops the npm scope from the tags. Add its path to `.release-please-manifest.json`, with the current version of core. Before the release PR merges, do "Publish a new package" in the `releasing-packages` skill. Its steps need the npm one-time codes of the user, so list them in your final report.
12. Update the repo config for the framework:
    - If the peer range covers an older major version of the framework, add it to the `framework` matrix in `.github/workflows/ci.yml`, with the `:unit`, `:ssr` and `:browser` projects of the package. The "Require CI" ruleset lists the name of each `framework` matrix entry, such as `Test (Vue 3.5.0)`. Only an admin can change it, so list the new name in your final report.
    - Add a `<framework>` case to `cases` in `scripts/smoke.mjs`, as the `vue` case does: it installs the tarballs, builds a page, checks the server markup, and checks the reveal in Chromium. Add entries with `browser: true` to the `smoke` matrix in `ci.yml` for the lowest and the highest version of the peer range. Add the case to the usage comment of `smoke.mjs` and to the `smoke.mjs` command in `AGENTS.md`. The "Require CI" ruleset lists each `smoke` matrix name, and only an admin can change it, so list the new names in your final report.
    - Add a group with the framework packages to the `npm` entry of `.github/dependabot.yml`.
    - If oxlint has a plugin for the framework, such as `vue`, enable it in an `overrides` entry of `.oxlintrc.json`. Limit the entry to the package and its example, as the Vue entry does.
13. Add the package to the package table in the root `README.md`. In `.github/ISSUE_TEMPLATE/bug_report.yml`, add it to the `package` dropdown, and add a StackBlitz template of the framework, such as `vite.new/vue-ts` or `astro.new/minimal`, to the reproduction field.
14. Add `.claude/rules/<framework>/adapter.md` for the gotchas of the framework, with `paths: ["packages/<framework>/**", "examples/<framework>/**"]`.
15. The docs site is the separate repo `awesome-reveal/website`. List the adapter page in your final report as work for that repo.
16. Run the checks:
    - `pnpm test --coverage`
    - `pnpm exec tsc -p packages/<framework>/test`, or the checker of step 6, such as `pnpm --filter @awesome-reveal/vue exec vue-tsc -p test`
    - `pnpm test:package`
    - `node scripts/smoke.mjs <framework>`, after `pnpm test:package` built the packages
    - `pnpm lint` and `pnpm format:check`
    - A manual check of the example in a browser

    Fix each failure, then run all the checks again. Open the PR only when all of them pass.
