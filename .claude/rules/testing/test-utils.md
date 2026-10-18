---
paths:
  - "packages/test-utils/**"
  - "packages/*/test/**"
---

# Shared test utilities

- `@awesome-reveal/test-utils` is private. It has no build, and release-please does not know it.
- The adapters do not list it as a dependency. They resolve it through the `tsconfig.base.json` paths and the `testUtils` alias in `vitest.config.ts`. A `workspace:*` dev dependency makes `pnpm publish` fail, because test-utils has no `version` field.
- Keep it free of frameworks.
- The console setup fails a test on each `console.error` or `console.warn` call, because frameworks report warnings, such as invalid props, only through the console. It accepts the Vitest relay of a window error that `collectWindowErrors()` collected. Vitest relays the error to `console.error` before any listener of the test runs, also in the capture phase in Chromium.
- `contract.ts` (`describeContract`, `describeCascadeContract`) and `contract-ssr.ts` (`describeSSRContract`) hold one scenario list that every adapter runs, so that all adapters behave the same. Each adapter has a `test/browser/contract.test.ts(x)`, and the SSR contract runs from the `ssr.test` file of the adapter. The contract mounts into `createStage()`, below the fold, and scrolls with `scrollIntoView()`, `showPart()` and `scrollToTop()`. The Astro harness builds the markup of `Host.astro` by hand, so `ssr.test.ts` checks the real output. A Vue harness unmounts with `cleanup()`, not with `screen.unmount()`.
- Do not skip a contract scenario to make a run pass. A scenario that fails is a bug of the adapter.
- Scenarios that expect a report must collect it: reports are thrown from a microtask, which Vitest counts as an unhandled error. Use a unique error message in each scenario and for each harness, so that a report of an identical message cannot hide it: core reports each message one time per module. Each browser test and the contract use `collectReports()` from `@awesome-reveal/test-utils/reports`. Read it with `expect(await reports())`. It wraps `queueMicrotask` and does not hold the microtasks, because React schedules its own work with it.
- Server markup in a hydration test is a literal. `useReveal` uses `useLayoutEffect` where `document` exists, and then React 18 warns in `renderToString`.
