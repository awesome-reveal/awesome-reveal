# awesome-reveal

Reveal-on-scroll animations for React, Vue, Astro and plain JavaScript. Content fades and slides in when it enters the viewport. Visit [awesome-reveal.dev](https://awesome-reveal.dev).

[![CI](https://github.com/awesome-reveal/awesome-reveal/actions/workflows/ci.yml/badge.svg?branch=next)](https://github.com/awesome-reveal/awesome-reveal/actions/workflows/ci.yml)
[![npm version](https://badgen.net/npm/v/@awesome-reveal/core)](https://www.npmjs.com/package/@awesome-reveal/core)
[![npm downloads](https://badgen.net/npm/dt/@awesome-reveal/core)](https://www.npmjs.com/package/@awesome-reveal/core)
[![GitHub stars](https://badgen.net/github/stars/awesome-reveal/awesome-reveal)](https://github.com/awesome-reveal/awesome-reveal/stargazers)
[![License](https://badgen.net/github/license/awesome-reveal/awesome-reveal)](LICENSE)

> **Release candidate:** The `@awesome-reveal/*` packages are a release candidate of version 1.0. The API is frozen, so only fixes go in before the stable release. Tell us what works and what does not in [GitHub Discussions](https://github.com/awesome-reveal/awesome-reveal/discussions).

<p align="center"><img src="https://raw.githubusercontent.com/awesome-reveal/awesome-reveal/next/.github/assets/demo.gif" alt="Elements fade, slide, scale, blur and rotate in as the page scrolls" width="640"></p>

- **Simple.** One component, or one function call, and a few options.
- **Native.** Built on the [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) and the [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API). The core is less than 2 kB gzipped.
- **No flash.** The framework packages hide server-rendered content until it reveals. If the script fails, the content shows after 5 seconds.
- **Accessible.** Obeys the reduced-motion preference, and shows waiting content on focus and in print.
- **CSP-friendly.** Writes no inline styles and no inline scripts.

## Packages

Install the package for your framework. Each README documents its API.

| Framework  | Package                                                 | Version                                                                                                       |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| React      | [`@awesome-reveal/react`](packages/react)               | [![npm](https://badgen.net/npm/v/@awesome-reveal/react)](https://www.npmjs.com/package/@awesome-reveal/react) |
| Vue        | [`@awesome-reveal/vue`](packages/vue)                   | [![npm](https://badgen.net/npm/v/@awesome-reveal/vue)](https://www.npmjs.com/package/@awesome-reveal/vue)     |
| Astro      | [`@awesome-reveal/astro`](packages/astro)               | [![npm](https://badgen.net/npm/v/@awesome-reveal/astro)](https://www.npmjs.com/package/@awesome-reveal/astro) |
| JavaScript | [`@awesome-reveal/core`](packages/core)                 | [![npm](https://badgen.net/npm/v/@awesome-reveal/core)](https://www.npmjs.com/package/@awesome-reveal/core)   |
| React (v4) | [`react-awesome-reveal`](packages/react-awesome-reveal) | [![npm](https://badgen.net/npm/v/react-awesome-reveal)](https://www.npmjs.com/package/react-awesome-reveal)   |

Version 5 of `react-awesome-reveal` re-exports `@awesome-reveal/react` for v4 users. To upgrade, read [Migrate from v4](packages/react#migrate-from-v4).

## Quick start

React:

```tsx
import { Reveal } from "@awesome-reveal/react";

export const Hero = () => <Reveal from="left">Hello</Reveal>;
```

Vue:

```vue
<script setup lang="ts">
import { Reveal, vReveal } from "@awesome-reveal/vue";
</script>

<template>
  <Reveal from="left">Hello</Reveal>
  <p v-reveal="{ from: { opacity: 0 } }">Fade only</p>
</template>
```

Astro:

```astro
---
import { Reveal } from "@awesome-reveal/astro";
---

<Reveal from="left">Hello</Reveal>
```

JavaScript:

```ts
import { cascade, reveal } from "@awesome-reveal/core";

reveal(".card", { from: "left" });
cascade(".features", { interval: 80 });
```

In most setups, you do not import a stylesheet. The README of each package gives the exceptions, such as an Astro island.

## Examples

The [`examples`](examples) folder has a small app for React, Vue, Astro and Next.js.

## Browser support

Core needs Chrome 104, Edge 104, Firefox 74 or Safari 14.1 (iOS 14.5), or later. Your framework and your bundler target can need more. Read [Browser support](packages/core#browser-support) in the core README. If IntersectionObserver or the Web Animations API is not available, the content shows immediately and does not stay hidden.

## Agent skills

The packages include agent skills that teach a coding agent the API. pnpm can link them into your project after you approve them. Each package README gives the names of its skills.

## Contributing

Open pull requests against the `next` branch. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) to set up the workspace. [`AGENTS.md`](AGENTS.md) lists the commands for the build, the tests and the lint.

## Support

- Report a bug in the [issue tracker](https://github.com/awesome-reveal/awesome-reveal/issues).
- Use [Discussions](https://github.com/awesome-reveal/awesome-reveal/discussions) to ask a question or to suggest a feature.
- If awesome-reveal helps you, [star the repository](https://github.com/awesome-reveal/awesome-reveal) or [support its creator](https://github.com/sponsors/morellodev).

## License

[MIT](LICENSE)
