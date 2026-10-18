---
paths:
  - "packages/*/test/browser/**"
  - "packages/test-utils/src/{layout,spies,reduced-motion,commands,contract}.ts"
---

# Browser tests

- Vitest browser mode runs each test in Chromium, Firefox and WebKit through Playwright. The viewport size is fixed in `vitest.config.ts`, because the helpers scroll by viewport heights.
- Coverage uses istanbul, because v8 coverage works only in Chromium in browser mode.
- Use a long `duration` (60 s) when a test inspects a running animation, so that it does not finish first.
- Wait for a DOM change with `expect.element(...)`. Use `settle()` when you expect no change.
- In CI, a failed test runs again, and the first retry records a Playwright trace. Vitest copies the traces and the failure screenshots into `.vitest/attachments`, and CI uploads that folder.
- Change the reduced motion setting with `setReducedMotion()`. It sends the `emulateReducedMotion` command, with an object payload, to `ctx.page`. The browser setup file resets it after each test. The media query event arrives only after a rendering update, so call `settle()` before you check the reaction.
- `emulateMedia({ media: "print" })` sends no `beforeprint` or `afterprint` event. A print test dispatches both events itself.
- Fault injection uses `vi.stubGlobal`, an invalid input, `withoutAnimate()` or `rejectEasing()`. All other spies call the real API.
- `interceptObserver()` is a pass-through spy on the `IntersectionObserver` constructor. It lets a test call the real callback with entries that it builds. Use it only when the real layout cannot make the entry: a cross-origin frame with no `rootBounds`, several entries in one report, or a threshold that no layout reaches.
- Compare elements, observers and animations by identity: use `expectSame()`, or `toHaveLength()` and then `toBe()`. `toEqual` treats two `IntersectionObserver` or two `Animation` instances as equal, and it compares DOM nodes with `isEqualNode`.
- Core reports each message one time per module. A report test with a message that the test controls adds a counter for each run. A message that the browser generates cannot change between runs in one page, so leave such a test out of a `--repeats` flakiness check with `-t`.
