# awesome-reveal

Reveal-on-scroll animations for many frameworks, built on IntersectionObserver and the Web Animations API. This pnpm workspace publishes the `@awesome-reveal/*` packages.

## Map

- `packages/core`: the `reveal` and `cascade` functions, which need no CSS, and the `/adapter` entry for the official adapters.
- `packages/react`, `packages/vue`, `packages/astro`: the framework adapters. Each depends on core and ships the CSS that hides its server markup.
- `packages/react-awesome-reveal`: the compat package for v4 users. It re-exports `@awesome-reveal/react`.
- `packages/test-utils`: private test helpers, pass-through spies, setup files and checks for the adapters.
- `packages/*/skills`: agent skills for the users of each package. pnpm links them into consumer projects.
- `examples/react`, `examples/vue`, `examples/astro`, `examples/next`: apps for manual checks (`pnpm --filter example-react dev`). The examples import the `dist` output of the packages, so run `pnpm build` first.
- `vite.lib.config.ts`: the library build that all packages share.
- `vitest.config.ts`: one Vitest project for each package and test kind, named `<package>:<kind>`.

## Commands

Use the Node version in `.nvmrc`.

- `pnpm exec playwright install --with-deps --only-shell chromium firefox webkit`: run once before the browser tests.
- `pnpm test`: the unit, SSR, browser and Astro e2e tests. Add `--coverage` to check the CI thresholds.
- `pnpm vitest run --project core:browser`: run one project.
- `REVEAL_BROWSERS=chromium,webkit pnpm test`: run the browser tests only in the listed browsers. The default is chromium, firefox and webkit.
- `pnpm exec tsc -p packages/<package>/test`: type-check the tests. For Vue, run `pnpm --filter @awesome-reveal/vue exec vue-tsc -p test`. `pnpm build` type-checks only `src`.
- `pnpm test:package`: build, then test the `dist` output with Vitest, publint and attw.
- `pnpm build`, then `node scripts/smoke.mjs <core|react|compat|vue|astro|astro-island|next|next-pages> [dependency@version ...]`: install the packed tarballs into a clean project and build it. Most cases also load the build in Chromium. CI runs the matrix.
- `pnpm lint` and `pnpm format`: lint and format the files. CI runs `pnpm format:check`.

The pre-commit hook runs oxlint and oxfmt on the staged files. CI runs the tests. The commit-msg hook runs commitlint with the Conventional Commits rules.

## Rules

- Open PRs against `next`. `main` keeps the v4 line until 1.0 ships.
- Use Conventional Commits. release-please writes the changelog from them, so mark each breaking change with `!` and a `BREAKING CHANGE:` footer.
- All packages share one version, through `linked-versions` in `release-please-config.json`. Each adapter depends on `@awesome-reveal/core` with `workspace:*`, so it publishes an exact version. The `/adapter` entry of core is a private contract, not semver API. The `data-awesome-reveal` attributes are public API: the READMEs document them, and users forward them.
- `react-awesome-reveal` is the exception. It continues the v4 version line, from 5.0.0. Do not add it to `linked-versions`: release-please gives all linked packages the highest version.
- Core imports no framework. The reveal options and all the behavior live in core, and an adapter only binds them to its framework, so that all adapters behave the same. The contract suite in `packages/test-utils` checks it.
- The packages are ESM-only. `"sideEffects"` lists only `*.css` when the package exports `reveal.css` or a JS module imports it, or is `false`. Astro is `false`, because its CSS import is in `Host.astro`, which Astro compiles. The build keeps one file per module, so bundlers drop the modules that a consumer does not import.
- Tests and type checks use the sources of other workspace packages, through the `tsconfig.base.json` paths and the `vitest.config.ts` alias. No build is necessary first.
