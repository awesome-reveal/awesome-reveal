---
paths:
  - "packages/react/**"
---

# React adapter

- Support React 18 and 19. CI runs the tests with each version. Keep `forwardRef` until the peer range drops React 18.
- `useReveal` reads `revealed` from `createReveal` with `useSyncExternalStore`, and renders `data-awesome-reveal` from it. `useCascade` uses the same binding with `createCascade`. Neither hook calls `reveal()`, because that breaks hydration. Core removes `data-awesome-reveal` and starts `play` in the task of the report. React renders the same removal later, from `revealed`. Do not start the animation in a passive effect.
- Keep `"use client"` at the top of each module that uses hooks. The build keeps one directive for each module.
- `react:browser` runs the component and hook tests in real browsers with `vitest-browser-react`. Do not wrap the tests in `act`.
- React reports `act()` warnings and server render warnings only through the console, so the shared console setup catches them.
- Type tests in `test/types` run with `react:unit`.
- The ref callback and the layout effect both give the element to core through `sync`. The ref callback queues it in a microtask, so it runs after the layout effect applies `setOptions` of the same commit. Without the wait, core starts the animation with the options of the previous render. The microtask is also necessary for a commit that renders only a child: a child can mount the element, or Suspense can hide and show it, and the layout effect of the hook does not run. React also detaches and attaches the same element in one commit when a callback ref changes, as an inline callback does on each render. The microtask sees only the final element, so the entrance does not replay.
- The first client render equals the server render: the server snapshot of the store is `revealed` too, so it is hidden, also when `when` is `true`. `test/browser/hydration.test.tsx` renders a literal server markup, hydrates it in a browser and fails on a mismatch warning. Keep one hydration test for each way to render the element.
- `getProps` merges only the `ref` and sets `data-awesome-reveal`. It passes `style` through, because the package `reveal.css` hides the element, so a `style` before or after the spread is safe. `data-awesome-reveal` and `data-awesome-reveal-attached` are reserved.
- The detach in `ref(null)` needs React to call a callback ref with `null`. React 19 documents that a future version removes this call for a callback with no cleanup. React 18 logs an error when a callback returns a function. Check the detach when a React version drops the call.
