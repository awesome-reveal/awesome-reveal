# react-awesome-reveal

Reveal-on-scroll animations for React. Version 5 re-exports [`@awesome-reveal/react`](https://www.npmjs.com/package/@awesome-reveal/react), so v4 users can upgrade with no new package name.

[![npm version](https://badgen.net/npm/v/react-awesome-reveal)](https://www.npmjs.com/package/react-awesome-reveal)
[![License](https://badgen.net/npm/license/react-awesome-reveal)](https://github.com/awesome-reveal/awesome-reveal/blob/next/LICENSE)

> **Release candidate:** Version 5 is a release candidate. The API is frozen, so only fixes go in before the stable release. Tell us what works and what does not in [GitHub Discussions](https://github.com/awesome-reveal/awesome-reveal/discussions).

## Install

```sh
npm install react-awesome-reveal@next
```

For a new project, install `@awesome-reveal/react` instead. The two packages give the same API.

## Quick start

```tsx
import { Reveal } from "react-awesome-reveal";

export const Hero = () => (
  <Reveal from="left">
    <h1>Hello</h1>
  </Reveal>
);
```

The package gives `Reveal`, `Cascade`, `useReveal`, `useCascade` and their types. Read the [`@awesome-reveal/react` README](https://www.npmjs.com/package/@awesome-reveal/react) for the full API and the steps to migrate from v4. Version 5 changes the API on purpose, so v4 code needs these steps.

## Stylesheet setup

The package loads its stylesheet automatically. Two setups need a step:

- **Astro island.** Import `react-awesome-reveal/reveal.css` in the page or in the layout that renders the island.
- **Next.js Pages Router with webpack.** Add `@awesome-reveal/react` to `transpilePackages` in the Next.js config. That package imports the stylesheet.

## Agent skills

The package includes the `migrating-from-v4` skill, which helps a coding agent migrate your code. pnpm can link it into your project after you approve it.

## License

[MIT](https://github.com/awesome-reveal/awesome-reveal/blob/next/LICENSE)
