---
paths:
  - "packages/svelte/**"
  - "examples/svelte/**"
---

# Svelte adapter

- `svelte-package` builds the package, not `vite.lib.config.ts`, because `vite-plugin-dts` cannot read `.svelte` files. It copies `src` to `dist`, compiles `.ts` modules, and leaves `.svelte` files, with their type-only TypeScript, and the runes of `.svelte.ts` modules for the consumer to compile. Files in `src` reach `dist` unless `scripts/declarations.js` removes them.
- The modules import `./reveal.css` directly, with no `#reveal-style.css` and no `node` condition. SvelteKit and Astro collect the page CSS from the server build, so a server build that loads no CSS sends no `reveal.css`, and the content flashes until the scripts load. Only a bundler with the Svelte plugin can load the package, so Node never imports the CSS.
- TypeScript 6 checks side-effect imports, and it does not read `reveal.css.d.ts` for `./reveal.css`. So `src/css.d.ts` declares `*.css` for the build.
- `scripts/declarations.js` runs after `svelte-package`:
  - It removes `css.d.ts`, which would declare every CSS import of the consumer, and the `./reveal.css` import of each `.d.ts`.
  - node16 and nodenext do not resolve `./Reveal.svelte` in a `.d.ts`. TypeScript then uses the ambient `*.svelte` module of Svelte, and the props have no types. `./Reveal.svelte.js` resolves to `Reveal.svelte.d.ts` in each module resolution.
- The `.` export has only `types` and `svelte`, as the SvelteKit packaging docs show. Node and `createRequire` cannot resolve it, so the package tests import `dist` by path, and `bundleFixture` resolves the package with the Svelte plugin.
- The `as` type excludes the void tags. The components render children, and Svelte warns `dynamic_void_element_content` in development for a void `svelte:element` with content.
- The `as` type also excludes the tags that break the hydration markers of the children. The parser reads the content of `textarea`, `title`, `script`, `style`, `iframe` and `noscript` as text, puts the content of `template` in a fragment, and drops `html`, `head` and `body` in the body. The table tags hydrate inside a table.
- The `as` type also allows `` `${string}-${string}` ``, because `svelte:element` accepts a custom element name. A custom element hydrates like an HTML tag.
- Type the `as` prop as `keyof HTMLElementTagNameMap` with `HTMLAttributes<HTMLElement>`. A generic tag with `SvelteHTMLElements` fails in `svelte-check` with "Expression produces a union type that is too complex to represent".
- The attachments take a getter of the options and read it in a child `$effect`. An options object would run the attachment again at each change, and the new store replays the entrance. Call `create` and `store.attach` inside `untrack`. `create` reads the properties of the options, and the getter can return a `$state` object. `onReveal` can run in the attach. Neither read may make the attachment run again.
- In `bind`, the component `$effect` that calls `setOptions` runs after the attachments of the template. So a new element of an `as` change attaches before a new `when` plays. `svelte:element` destroys the old element before the attachment of the new element runs, with no outro, so the cleanup detaches the store without a check.
- Attachments do not run on the server, so the attachments render no hidden state. Use `Reveal` and `Cascade` for SSR.
- The hydration check of Svelte catches only structural mismatches of the markers, not different static text or attributes. So `hydration.test.ts` compares the server markup with a literal in `ssr.test.ts`.
- A test that uses runes needs the `.svelte.test.ts` suffix. Svelte warns `state_referenced_locally` when you read a reassigned `$state` in the scope that declares it. Read it through an object property or a getter in an assertion.
- The contract harness unmounts more than one time. Make its unmount idempotent, or Svelte warns `lifecycle_double_unmount`.
- Do not import `svelte/compiler` in a browser test. It loads the compiler into the page, and the attachment tests fail in the full run.
- The root `@sveltejs/vite-plugin-svelte` compiles the tests with the Svelte version of the root. Its compiler must match the runtime: a newer compiler imports runtime modules, such as `svelte/internal/init-operations`, that an older runtime does not have. So the `framework` job of `ci.yml` also installs the matrix version at the root, through `root-deps`.
- The Svelte peer floor, 5.46.4, is the floor of `@sveltejs/vite-plugin-svelte` 7. The tests need plugin 7, because Vitest needs Vite 8. Lower the floor only when CI can test it with a supported plugin.
- Type-check the tests with `pnpm --filter @awesome-reveal/svelte exec svelte-check --tsconfig test/tsconfig.json`, because `tsc` cannot read `.svelte` files.
- `describeDocs` does not check the `svelte` fences.
