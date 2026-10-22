# @awesome-reveal/astro

Reveal-on-scroll animations for Astro. Wrap content in `<Reveal>`, and it fades and slides in when it enters the viewport. No framework, no hydration directive and no stylesheet import.

[![npm version](https://badgen.net/npm/v/@awesome-reveal/astro)](https://www.npmjs.com/package/@awesome-reveal/astro)
[![License](https://badgen.net/npm/license/@awesome-reveal/astro)](https://github.com/awesome-reveal/awesome-reveal/blob/next/LICENSE)

> **Release candidate:** This is a release candidate of version 1.0. The API is frozen, so only fixes go in before the stable release. Tell us what works and what does not in [GitHub Discussions](https://github.com/awesome-reveal/awesome-reveal/discussions).

<p align="center"><img src="https://raw.githubusercontent.com/awesome-reveal/awesome-reveal/next/.github/assets/demo.gif" alt="Elements fade, slide, scale, blur and rotate in as the page scrolls" width="640"></p>

- **Simple.** Two components and a few options.
- **Native.** A small custom element, built on IntersectionObserver and the Web Animations API.
- **No flash.** Server-rendered content stays hidden until it reveals.
- **Astro-ready.** Works with the `<ClientRouter />`, server islands and `transition:persist`.
- **Accessible.** Obeys the reduced-motion preference, and shows waiting content on focus and in print.

Works with Astro 6 and 7.

## Install

```sh
npm install @awesome-reveal/astro
```

The package loads its stylesheet and a small client script automatically.

## Quick start

```astro
---
import { Reveal } from "@awesome-reveal/astro";
---

<Reveal><h1>Hello</h1></Reveal>
```

The content fades in and moves up one time, when it enters the viewport.

## Usage

### Choose the entrance

`from` sets where the element starts. A side gives a fade and a 24 px movement. The default is `"bottom"`.

```astro
<Reveal from="left">From the left</Reveal>
```

For a different entrance, give a start state. The element animates from this state to neutral values: full opacity, no offset, a scale of 1, no rotation and no blur. The element's own value of an animated property applies only after the entrance ends. A start state replaces the default, so add `opacity: 0` if you want a fade.

```astro
<Reveal from={{ opacity: 0 }}>Fade only</Reveal>
<Reveal from={{ scale: 0.9 }}>Scale only</Reveal>
<Reveal from={{ opacity: 0, x: "-100%", rotate: "-5deg", blur: 8 }}>All together</Reveal>
```

A start state has the properties `opacity`, `x`, `y`, `scale`, `rotate` and `blur`. A number for `x`, `y` or `blur` is in pixels, and a number for `rotate` is in degrees. A string can contain a CSS value with its unit.

### Use your own keyframes

For full control, such as a custom easing, give native [keyframes](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats) instead of `from`. End them at the resting style of the element.

```astro
<Reveal
  keyframes={[
    { opacity: 0, transform: "scale(.8)", easing: "cubic-bezier(.34,1.56,.64,1)" },
    { opacity: 1, transform: "scale(1)" },
  ]}
>
  Bounce in
</Reveal>
```

### Change the timing

```astro
<Reveal as="h2" from="left" duration={800}>Title</Reveal>
<Reveal from={{ opacity: 0 }} delay={200}>Starts after the title</Reveal>
<Reveal threshold={0.5}>Reveals when half of it is visible</Reveal>
```

Keep `delay` below about 300 ms. A long delay makes content appear late when the user scrolls quickly.

### Reveal a list

`Cascade` reveals its direct children one after the other, when it enters the viewport. `interval` sets the time between two children, and the default is 80 ms.

```astro
---
import { Cascade } from "@awesome-reveal/astro";
---

<Cascade as="ul" from="left" interval={120}>
  <li>Fast</li>
  <li>Small</li>
</Cascade>
```

For a long list, or a grid that is taller than the viewport, wrap each item in `Reveal` instead. A cascade schedules all children at the same time, so the last children start late or out of view.

### Control the reveal

`when` controls the entrance. `true` plays it, and `false` resets it with no exit animation. Without `when`, the viewport controls it. A change from `true` to `null` keeps the element revealed. In a client script, pass the rendered tag to `getReveal`, and set the `when` property of the result.

`when` does not show or hide content. With `when={false}`, the element is transparent, but screen readers read it and the keyboard can focus it. `inert` does not hide content: it only blocks focus, clicks and assistive technology. To hide content, also set `hidden` on the rendered tag:

```astro
---
import { Reveal } from "@awesome-reveal/astro";
---

<button id="toggle" aria-expanded="false">Toggle</button>
<Reveal id="details" when={false} hidden from={{ opacity: 0 }}>Details</Reveal>

<script>
  import { getReveal } from "@awesome-reveal/astro";

  const button = document.querySelector("#toggle")!;
  const details = document.querySelector("#details")!;
  const reveal = getReveal(details);

  button.addEventListener("click", () => {
    const open = !reveal.when;
    reveal.when = open;
    details.toggleAttribute("hidden", !open);
    button.setAttribute("aria-expanded", String(open));
  });
</script>
```

To play the entrance again, set `when` to `false`, then to `true`. With the `<ClientRouter />`, get the elements again in an `astro:page-load` listener, because each navigation renders new elements.

### Run code at the reveal

The rendered tag dispatches a `reveal` event that bubbles, when the reveal starts. The result of `getReveal` has a `revealed` property. To wait for the end of the entrance, wait for the `finished` promises of the animations of the event target:

```ts
document.addEventListener("reveal", (event) => {
  const element = event.target as Element;
  Promise.all(element.getAnimations().map((animation) => animation.finished))
    .then(() => element.classList.add("entered"))
    .catch(() => {});
});
```

The promise rejects when the entrance stops early, for example after `when` becomes `false`. Catch the rejection. It resolves at once when no entrance plays, for example with reduced motion. It also waits for your own animations of the element. For a cascade, use `getAnimations({ subtree: true })`, because the children animate. An animation that repeats forever never finishes, so the promise does not resolve.

## API

### `<Reveal>` and `<Cascade>`

| Prop                        | Type                 | Default    | Description                                                     |
| --------------------------- | -------------------- | ---------- | --------------------------------------------------------------- |
| `as`                        | `RevealTag`          | `"div"`    | The rendered tag                                                |
| `from`                      | `Side \| StartState` | `"bottom"` | The side or the start state of the entrance                     |
| `keyframes`                 | `Keyframe[]`         | —          | Native keyframes. You cannot use them together with `from`      |
| `duration`                  | `number`             | `600`      | The duration of the entrance, in milliseconds                   |
| `delay`                     | `number`             | `0`        | The time between the reveal and the entrance, in milliseconds   |
| `threshold`                 | `number`             | `0`        | The visible fraction, from 0 to 1, that reveals the element     |
| `when`                      | `boolean \| null`    | —          | `true` plays the entrance, `false` resets it                    |
| `interval` (`Cascade` only) | `number`             | `80`       | The time between the entrances of two children, in milliseconds |

The components pass the other attributes and the children to the rendered tag.

### `getReveal(element)`

Gives the control of the reveal of a tag that `Reveal` or `Cascade` rendered. It throws for any other element. Call it in a client script.

| Member     | Description                                                               |
| ---------- | ------------------------------------------------------------------------- |
| `when`     | Gets or sets the manual control. `null` gives the control to the viewport |
| `revealed` | Tells if the element is revealed                                          |

The rendered tag dispatches a `reveal` event that bubbles, one time for each reveal. Each component renders its tag inside a host element with `display: contents`. The host does not change the layout, but the child combinator (`>`), `:nth-child()` and `parentElement` see it.

### Behavior

- The entrance plays one time. The observation stops at the reveal.
- The `reveal` event also fires when no entrance plays, for example with reduced motion or focus. After `when` becomes `false`, the next reveal fires it again.
- A change to `when` or `threshold` applies immediately. A change to the other options applies at the next reveal.
- `when={false}` during the `delay` resets the entrance, and the entrance does not play.

## Where you can put a reveal

The HTML parser moves some tags out of the host element. Obey these rules:

- `as` accepts an HTML tag or `svg`. TypeScript rejects document tags (`html`, `head`, `body`), table parts (`caption`, `col`, `colgroup`, `thead`, `tbody`, `tfoot`, `tr`, `td`, `th`) and SVG-only tags.
- Do not put `Reveal` or `Cascade` directly in a `<table>`, a table section, a row or a `<select>`. Reveal the whole table, or reveal content inside a table cell:

  ```astro
  <Reveal as="table">
    <tbody>
      <tr><td>The whole table reveals together.</td></tr>
    </tbody>
  </Reveal>
  ```

- In a `<p>`, also inline in MDX text, use an inline tag, such as `as="span"`.

If the parser moves the tag, the host reports an error in the browser console, and the tag shows without an entrance after a few seconds.

## Accessibility

- With `prefers-reduced-motion: reduce`, all the content shows immediately, with no animation.
- Focus in a waiting element shows it at once, so a keyboard user does not focus invisible content. This does not apply with `when={false}`.
- Focus during the delay or the entrance finishes the entrance at once.
- Before the script loads, server markup shows while it has focus.
- Waiting content shows in print and when JavaScript is off.
- Hidden content stays in the accessibility tree. Do not make important content depend on decorative motion.

## Good to know

<details>
<summary>Cascades</summary>

- The cascade reads its children when it reveals. A child that you add after the reveal shows with no animation.
- Only the direct element children animate. Text and children with `display: contents` show immediately.
- A framework island and the host of a nested `Reveal` have `display: contents`, so the cascade does not animate them. A nested `Reveal` plays only its own entrance. To put an island in the cascade, wrap it in an element.
- `delay` moves the start of the whole sequence. The `reveal` event comes from the rendered tag.

</details>

<details>
<summary>Navigation and prerendering</summary>

- Reveals work after a `<ClientRouter />` navigation, in server islands and with `transition:persist`.
- A prerendered page does not animate until the browser activates it.

</details>

<details>
<summary>How the stylesheet hides content</summary>

- The server markup has `data-awesome-reveal="hidden"`, or `data-awesome-reveal="cascade"` for a cascade.
- The stylesheet hides content for at most 5 seconds before the client script attaches the element. If the script fails, the content shows. If the attach happens later, for example on a slow network, the content shows, then hides again until it reveals.
- The stylesheet hides with the `awesome-reveal-hold` CSS animation, which replaces your own `animation` on a waiting element until it reveals. Put your own animation on an inner element. The hold fires `animationstart` and `animationend` events, and shows in `getAnimations()`.
- An inline `opacity` with `!important`, or your own `animation` with `!important`, can show the element before the reveal.
- The stylesheet does not reach a shadow root.
- In browsers without the `scripting` media feature, such as Safari 16, content shows after 5 seconds when JavaScript is off.

</details>

<details>
<summary>Content Security Policy</summary>

The package writes no `style` attribute, no inline script and no CSS at runtime. But Astro can put the package stylesheet and your scripts inline in the HTML. Use one of these setups:

- Set `security.csp: true`. Astro adds a `<meta>` policy with hashes for the inline styles and scripts that it emits. Astro adds the policy only to the build, so use `astro build` and `astro preview` to check it. Astro does not support this option with the `<ClientRouter />`.
- Send your own policy, such as `style-src 'self'; script-src 'self'`, and set `build.inlineStylesheets: 'never'`. With the default `'auto'`, Astro puts stylesheets smaller than `vite.build.assetsInlineLimit` (4 kB by default) in a `<style>` element. If the policy blocks the package stylesheet, the content does not hide before the reveal, and the host element is not `display: contents`. Also make sure that the built HTML has no inline `<script>` that your policy blocks.

</details>

<details>
<summary>React and Vue islands</summary>

To reveal content inside a React or Vue island, use [`@awesome-reveal/react`](https://www.npmjs.com/package/@awesome-reveal/react) or [`@awesome-reveal/vue`](https://www.npmjs.com/package/@awesome-reveal/vue) in the island, and import its `reveal.css` in the page. Hydrate the island eagerly, for example with `client:load`.

</details>

<details>
<summary>Entrance details</summary>

The `@awesome-reveal/core` README describes how the entrance works, the thresholds of tall and clipped content, performance and errors. Read it on [npm](https://www.npmjs.com/package/@awesome-reveal/core).

</details>

## Agent skills

The package includes the `adding-reveal-animations` skill, which teaches a coding agent this API. pnpm can link it into your project after you approve it.

## License

[MIT](https://github.com/awesome-reveal/awesome-reveal/blob/next/LICENSE)
