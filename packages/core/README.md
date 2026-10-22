# @awesome-reveal/core

Reveal-on-scroll animations in plain JavaScript. Give a selector, and the elements fade and slide in when they enter the viewport.

[![npm version](https://badgen.net/npm/v/@awesome-reveal/core)](https://www.npmjs.com/package/@awesome-reveal/core)
[![License](https://badgen.net/npm/license/@awesome-reveal/core)](https://github.com/awesome-reveal/awesome-reveal/blob/next/LICENSE)

> **Release candidate:** This is a release candidate of version 1.0. The API is frozen, so only fixes go in before the stable release. Tell us what works and what does not in [GitHub Discussions](https://github.com/awesome-reveal/awesome-reveal/discussions).

<p align="center"><img src="https://raw.githubusercontent.com/awesome-reveal/awesome-reveal/next/.github/assets/demo.gif" alt="Elements fade, slide, scale, blur and rotate in as the page scrolls" width="640"></p>

- **Small.** Less than 2 kB gzipped, with no dependencies and no stylesheet.
- **Native.** Built on IntersectionObserver and the Web Animations API.
- **Accessible.** Obeys the reduced-motion preference, and shows waiting content on focus and in print.
- **CSP-friendly.** Writes no inline styles, so it works with a strict Content Security Policy.

Do you use React, Vue or Astro? Use [`@awesome-reveal/react`](https://www.npmjs.com/package/@awesome-reveal/react), [`@awesome-reveal/vue`](https://www.npmjs.com/package/@awesome-reveal/vue) or [`@awesome-reveal/astro`](https://www.npmjs.com/package/@awesome-reveal/astro). They also hide server-rendered content until it reveals.

## Install

```sh
npm install @awesome-reveal/core
```

## Quick start

```ts
import { cascade, reveal } from "@awesome-reveal/core";

reveal(".card"); // Fade in and move up
reveal(".hero", { from: "left" }); // Fade in from the left
cascade(".features"); // Reveal the children of .features one after the other
```

Each element animates one time, when it enters the viewport.

## Usage

### Choose the entrance

`from` sets where the element starts. A side gives a fade and a 24 px movement:

| `from`               | Start offset |
| -------------------- | ------------ |
| `"top"`              | y: -24 px    |
| `"right"`            | x: 24 px     |
| `"bottom"` (default) | y: 24 px     |
| `"left"`             | x: -24 px    |

For a different entrance, give a start state. The element animates from this state to neutral values: full opacity, no offset, a scale of 1, no rotation and no blur. The element's own value of an animated property applies only after the entrance ends. A start state replaces the default, so add `opacity: 0` if you want a fade.

```ts
import { reveal } from "@awesome-reveal/core";

reveal(".caption", { from: { opacity: 0 } }); // Fade only
reveal(".logo", { from: { scale: 0.9 } }); // Scale only
reveal(".card", { from: { opacity: 0, x: "-100%", rotate: "-5deg", blur: "0.5rem" } });
```

A start state has the properties `opacity`, `x`, `y`, `scale`, `rotate` and `blur`. A number for `x`, `y` or `blur` is in pixels, and a number for `rotate` is in degrees. A string can contain a CSS value with its unit.

### Use your own keyframes

For full control, such as a custom easing, give native [keyframes](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats) instead of `from`:

```ts
import { reveal } from "@awesome-reveal/core";

reveal(".logo", {
  keyframes: [
    { opacity: 0, transform: "scale(.8)", easing: "cubic-bezier(.34,1.56,.64,1)" },
    { opacity: 1, transform: "scale(1)" },
  ],
});
```

- End the keyframes at the resting style of the element. The animation does not keep its last keyframe after it ends.
- Give explicit values to the first keyframe. An open WebKit bug ([212409](https://bugs.webkit.org/show_bug.cgi?id=212409)) can take an implicit start value from an earlier animation.
- To end at the element's own value, end with a neutral additive keyframe, for example `{ opacity: 0, composite: "add" }`.

### Change the timing

```ts
import { reveal } from "@awesome-reveal/core";

reveal(".hero h1", { from: "left", duration: 800 });
reveal(".hero p", { from: { opacity: 0 }, delay: 200 }); // Starts after the heading
reveal(".chart", { threshold: 0.5 }); // Reveals when half of it is visible
```

Keep `delay` below about 300 ms. A long delay makes content appear late when the user scrolls quickly.

### Reveal a list

`cascade()` reveals the direct children of a container one after the other, when the container enters the viewport. The child at position `index` starts after `delay + index * interval` milliseconds.

```ts
import { cascade } from "@awesome-reveal/core";

cascade(".features", { from: { opacity: 0, y: 16 }, interval: 120 });
```

For a long list, or a grid that is taller than the viewport, use `reveal(".item")` instead. A cascade schedules all children at the same time, so the last children start late or out of view.

### Clean up

Each call returns a handle. Call `dispose()` when you remove the elements before they reveal, for example when a single-page app changes the route:

```ts
import { reveal } from "@awesome-reveal/core";

const handle = reveal(".card");

// Later, when you remove the cards:
handle.dispose();
```

`dispose()` stops the observers and cancels the animations, and the elements return to their own styles. After all the entrances of a call finish, core keeps no reference to the elements, so you do not need `dispose()`.

### Play an entrance manually

Some content does not reach the observer, for example a carousel slide that its track clips. To play its waiting entrance, play its paused animations:

```ts
import { reveal } from "@awesome-reveal/core";

reveal(".slide", { from: "left" });

export function playEntrance(slide: Element) {
  for (const animation of slide.getAnimations()) {
    if (animation.playState === "paused") animation.play();
  }
}
```

For a cascade, call `getAnimations({ subtree: true })` on the container. The loop also plays your own paused animations on the element.

## API

### `reveal(target, options?)`

Reveals each target when it enters the viewport. Returns a `RevealHandle`.

### `cascade(target, options?)`

Reveals the direct element children of each target, one after the other, when the target enters the viewport. Returns a `RevealHandle`.

### Targets

`target` is one of these:

- an element
- a CSS selector
- an iterable of elements
- an array-like collection, such as `children`

Core finds the targets and the cascade children one time, when you call the function. It does not see elements that you add later.

### Options

| Option                      | Type                 | Default    | Description                                                     |
| --------------------------- | -------------------- | ---------- | --------------------------------------------------------------- |
| `from`                      | `Side \| StartState` | `"bottom"` | The side or the start state of the entrance                     |
| `keyframes`                 | `Keyframe[]`         | —          | Native keyframes. You cannot use them together with `from`      |
| `duration`                  | `number`             | `600`      | The duration of the entrance, in milliseconds                   |
| `delay`                     | `number`             | `0`        | The time between the reveal and the entrance, in milliseconds   |
| `threshold`                 | `number`             | `0`        | The visible fraction, from 0 to 1, that reveals the element     |
| `interval` (`cascade` only) | `number`             | `80`       | The time between the entrances of two children, in milliseconds |

The package also exports the types `Side`, `StartState`, `RevealOptions`, `CascadeOptions`, `RevealTarget` and `RevealHandle`. The `@awesome-reveal/core/adapter` entry is for the official framework packages. It is not a public API.

## Accessibility

- With `prefers-reduced-motion: reduce`, all the content shows immediately, with no animation and no delay. If the preference changes, core cancels the waiting and the running animations.
- Focus in a waiting element shows it at once, so a keyboard user does not focus invisible content. Focus in a waiting cascade container shows all its children.
- Focus during the delay or the entrance finishes the entrance at once.
- Waiting content shows in print. After the print, it waits again. Core uses the `beforeprint` and `afterprint` events, so a print emulation in developer tools does not show the content.
- Hidden content stays in the accessibility tree. Do not make important content depend on decorative motion.

## Server-side rendering

You can import the package on a server, but call `reveal()` and `cascade()` only in the browser. Core does not hide content before your script runs, so server-rendered content can show, then animate. The React, Vue and Astro packages hide it with a stylesheet.

## Good to know

<details>
<summary>How the entrance works</summary>

- Core calls `element.animate(keyframes, { duration, delay, fill: "backwards" })` and pauses the animation at its start. It plays the animation when the element enters the viewport. The entrance plays one time, and the observation stops at the reveal. There is no exit animation.
- The entrance animates `opacity` and the individual `translate`, `scale`, `rotate` and `filter` properties, but only the properties that the start state sets. Your own `transform` stays in effect, for example the `translate(-50%, -50%)` of a centred dialog.
- While the element waits and during the entrance, the element's own values of the animated properties do not apply. To keep one of these values, put it on an inner element, or use native keyframes.
- Do not reveal one element in two calls. The later entrance overrides the earlier one.
- You cannot change the easing of the generated entrance. For a different easing, use native keyframes.
- If your code finishes or cancels the paused animation before the reveal, the element shows at rest and the entrance does not play.
- A paused animation does not finish. If your code waits for all of `document.getAnimations()`, skip the animations with `playState === "paused"`.

</details>

<details>
<summary>Cascades</summary>

- Only the direct element children animate. Text nodes and deeper descendants do not animate.
- To cascade the words of a text, wrap each word in an element. A transform needs a transformable element, so give inline children `display: inline-block`.
- A negative `interval` gives negative delays, so each later child starts further into its entrance.
- `cascade()` observes the container, which does not move.

</details>

<details>
<summary>Thresholds and clipped content</summary>

- If the viewport is too small to show `threshold` of the element, the element reveals when it enters the viewport. In a scroll container that is too small, it reveals when it leaves the visible area. Keep the default 0 for tall elements and long cascades.
- A start state with `opacity: 0`, such as each side, waits at its resting position. Other start states and native keyframes wait at their first keyframe, so their offset, scale and rotation change the box that the observer sees.
- If an ancestor with `overflow` clips the element fully, the element does not reveal. Play the entrance manually.

</details>

<details>
<summary>Performance</summary>

- The generated entrance runs on the compositor, so a busy main thread does not make it stutter. A start state with `blur` is the exception: Chromium runs it on the main thread.
- In your own keyframes, animate `opacity`, `transform`, `translate`, `scale` and `rotate` when possible. A layout property, such as `width`, `top` or `margin`, causes a layout and a paint on each frame.
- Chromium runs an animation with an additive keyframe on the main thread.
- Do not add `will-change` for a reveal. The browser treats an animated property as if `will-change` already names it.

</details>

<details>
<summary>Errors</summary>

- `reveal()` and `cascade()` do not throw for an invalid option. The browser validates the options. If it rejects an easing or a duration, the element shows with no animation. If it rejects the threshold, the entrance plays immediately.
- An invalid CSS selector throws the `SyntaxError` of `querySelectorAll`.
- The browser ignores an invalid CSS value in a keyframe, and reports nothing.
- Core reports the browser's errors from a microtask, so the console and your error tracker get them. It reports each message one time on a page. WebKit gives the same message to different easing and duration errors, so fix the first error and reload the page to see the next one.

</details>

<details>
<summary>Content Security Policy</summary>

Core writes no `style` attribute, no inline script and no CSS. It uses `element.animate()`, which Content Security Policy does not restrict. A policy such as `style-src 'self'; script-src 'self'` works with core.

</details>

## Browser support

Chrome 104, Edge 104, Firefox 74 and Safari 14.1 (iOS 14.5), or later. A native keyframe with `composite` needs Firefox 80 or Safari 16. Without IntersectionObserver, the entrance plays at once. Without `Element.animate()`, the content shows with no animation. In both cases, the content does not stay hidden.

## Agent skills

The package includes the `adding-reveal-animations` skill, which teaches a coding agent this API. pnpm can link it into your project after you approve it.

## License

[MIT](https://github.com/awesome-reveal/awesome-reveal/blob/next/LICENSE)
