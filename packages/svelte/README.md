# @awesome-reveal/svelte

Reveal-on-scroll animations for Svelte. Wrap content in `<Reveal>`, or attach `reveal` to an element, and it fades and slides in when it enters the viewport.

[![npm version](https://badgen.net/npm/v/@awesome-reveal/svelte)](https://www.npmjs.com/package/@awesome-reveal/svelte)
[![License](https://badgen.net/npm/license/@awesome-reveal/svelte)](https://github.com/awesome-reveal/awesome-reveal/blob/main/LICENSE)

<p align="center"><img src="https://raw.githubusercontent.com/awesome-reveal/awesome-reveal/main/.github/assets/demo.gif" alt="Elements fade, slide, scale, blur and rotate in as the page scrolls" width="640"></p>

- **Simple.** Two components, two attachments, and a few options.
- **Native.** Built on IntersectionObserver and the Web Animations API, with no animation library.
- **SSR-ready.** Server-rendered content stays hidden until it reveals, with no flash.
- **Accessible.** Obeys the reduced-motion preference, and shows waiting content on focus and in print.
- **CSP-friendly.** Writes no inline styles and no inline scripts.

Works with Svelte 5.46.4 and later.

## Install

```sh
npm install @awesome-reveal/svelte
```

The package loads its [stylesheet](#stylesheet) automatically, also in SvelteKit and in an Astro island.

## Quick start

```svelte
<script lang="ts">
  import { Reveal, reveal } from "@awesome-reveal/svelte";
</script>

<Reveal><h1>Hello</h1></Reveal>
<p {@attach reveal()}>No wrapper element</p>
```

The content fades in and moves up one time, when it enters the viewport.

## Usage

`Reveal` and the `reveal` attachment accept the same options. `Reveal` renders a `div` around its children, and `as` changes the tag. The attachment animates an element that you already render. Give its options as a function, such as `reveal(() => ({ from: "left" }))`, so that a change of your state updates the options and does not replay the entrance.

The attachments do not run on the server. Use `Reveal` and `Cascade` for server-rendered content. With an attachment, server-rendered content shows until hydration, then hides until it reveals.

### Choose the entrance

`from` sets where the element starts. A side gives a fade and a 24 px movement. The default is `"bottom"`.

```svelte
<Reveal from="left">From the left</Reveal>
<p {@attach reveal(() => ({ from: "right" }))}>From the right</p>
```

For a different entrance, give a start state. The element animates from this state to neutral values: full opacity, no offset, a scale of 1, no rotation and no blur. The element's own value of an animated property applies only after the entrance ends. A start state replaces the default, so add `opacity: 0` if you want a fade.

```svelte
<Reveal from={{ opacity: 0 }}>Fade only</Reveal>
<Reveal from={{ scale: 0.9 }}>Scale only</Reveal>
<Reveal from={{ opacity: 0, x: "-100%", rotate: "-5deg", blur: 8 }}>All together</Reveal>
```

A start state has the properties `opacity`, `x`, `y`, `scale`, `rotate` and `blur`. A number for `x`, `y` or `blur` is in pixels, and a number for `rotate` is in degrees. A string can contain a CSS value with its unit.

### Use your own keyframes

For full control, such as a custom easing, give native [keyframes](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats) instead of `from`. End them at the resting style of the element.

```ts
import { reveal } from "@awesome-reveal/svelte";

export const bounce: Keyframe[] = [
  { opacity: 0, transform: "scale(.8)", easing: "cubic-bezier(.34,1.56,.64,1)" },
  { opacity: 1, transform: "scale(1)" },
];

export const bounceIn = reveal(() => ({ keyframes: bounce }));
```

```svelte
<Reveal keyframes={bounce}>Bounce in</Reveal>
<p {@attach bounceIn}>Bounce in</p>
```

### Change the timing

```svelte
<Reveal as="h2" from="left" duration={800}>Title</Reveal>
<Reveal from={{ opacity: 0 }} delay={200}>Starts after the title</Reveal>
<Reveal threshold={0.5}>Reveals when half of it is visible</Reveal>
```

Keep `delay` below about 300 ms. A long delay makes content appear late when the user scrolls quickly.

### Reveal a list

`Cascade` and the `cascade` attachment reveal the direct children one after the other, when the container enters the viewport. `interval` sets the time between two children, and the default is 80 ms.

```svelte
<script lang="ts">
  import { Cascade, cascade } from "@awesome-reveal/svelte";
</script>

<Cascade as="ul" from="left" interval={120}>
  <li>Fast</li>
  <li>Small</li>
</Cascade>
<ol {@attach cascade()}>
  <li>Install</li>
  <li>Import</li>
</ol>
```

For a long list, a virtualized list, or a grid that is taller than the viewport, use `Reveal` or the `reveal` attachment on each item instead. A cascade schedules all children at the same time, so the last children start late or out of view.

### Control the reveal

`when` controls the entrance from your state. `true` plays it, and `false` resets it with no exit animation. With `null` or no value, the viewport controls it. A change from `true` to `null` keeps the element revealed.

`when` does not show or hide content. With `when: false`, the element is transparent, but screen readers read it and the keyboard can focus it. `inert` does not hide content: it only blocks focus, clicks and assistive technology. To hide content, also set `hidden`, or use `{#if}`:

```svelte
<script lang="ts">
  import { Reveal } from "@awesome-reveal/svelte";

  let open = $state(false);
</script>

<button aria-expanded={open} onclick={() => (open = !open)}>Toggle</button>
<Reveal when={open} hidden={!open} from={{ opacity: 0 }}>Details</Reveal>
```

To play the entrance again, set `when` to `false`, then to `true`.

### Run code at the reveal

`onReveal` runs with the element when the reveal starts. `Reveal` also gives `revealed` to its `children` snippet. To wait for the end of the entrance, wait for the `finished` promises of the animations:

```svelte
<script lang="ts">
  import { Reveal } from "@awesome-reveal/svelte";

  function entered(element: Element) {
    Promise.all(element.getAnimations().map((animation) => animation.finished))
      .then(() => element.classList.add("entered"))
      .catch(() => {});
  }
</script>

<Reveal onReveal={entered}>
  {#snippet children({ revealed })}
    {revealed ? "Hello" : "Waiting"}
  {/snippet}
</Reveal>
```

The promise rejects when the entrance stops early, for example after `when: false` or an unmount. Catch the rejection. It resolves at once when no entrance plays, for example with reduced motion. It also waits for your own animations of the element. For a cascade, use `getAnimations({ subtree: true })`, because the children animate. An animation that repeats forever never finishes, so the promise does not resolve.

## API

### `<Reveal>`, `<Cascade>`, `reveal` and `cascade`

| Option                    | Type                 | Default    | Description                                                     |
| ------------------------- | -------------------- | ---------- | --------------------------------------------------------------- |
| `as` (components only)    | HTML tag name        | `"div"`    | The rendered tag                                                |
| `from`                    | `Side \| StartState` | `"bottom"` | The side or the start state of the entrance                     |
| `keyframes`               | `Keyframe[]`         | —          | Native keyframes. You cannot use them together with `from`      |
| `duration`                | `number`             | `600`      | The duration of the entrance, in milliseconds                   |
| `delay`                   | `number`             | `0`        | The time between the reveal and the entrance, in milliseconds   |
| `threshold`               | `number`             | `0`        | The visible fraction, from 0 to 1, that reveals the element     |
| `when`                    | `boolean \| null`    | —          | `true` plays the entrance, `false` resets it                    |
| `onReveal`                | `(element) => void`  | —          | Runs one time for each reveal, when it starts                   |
| `interval` (cascade only) | `number`             | `80`       | The time between the entrances of two children, in milliseconds |

The components give `revealed` to the `children` snippet, and pass the other props to the rendered element as attributes. Their types accept the global HTML attributes, such as `id`, `class` and `aria-*`, and the attachments that you give to the component. `as` accepts a custom element, such as `my-card`. It accepts no void tag, such as `img`, because the components render children. It also accepts no tag whose children cannot hydrate, such as `textarea`, `title` or `template`. The attachments take a function that returns the options.

### Behavior

- The entrance plays one time. The observation stops at the reveal.
- `onReveal` also runs when no entrance plays, for example with reduced motion or focus. After `when: false`, the next reveal runs it again.
- A change to `when` or `threshold` applies immediately. A change to the other options applies at the next reveal.
- `when: false` during the `delay` resets the entrance, and the entrance does not play.
- A component keeps its reveal when `as` changes. An attachment belongs to its element, so a new element, such as one in a `{#key}` block, starts a new reveal.

## Stylesheet

The package stylesheet hides server-rendered content until it reveals. The package modules import it on the server and in the browser, so SvelteKit and Astro add it to the server HTML. To import it yourself, use `@awesome-reveal/svelte/reveal.css`.

## Server-side rendering

The server markup of `Reveal` and `Cascade` is hidden until the element reveals. If the script fails, the content shows after 5 seconds. Hydrate reveal content eagerly: with lazy hydration, such as an Astro `client:visible` island, the content can show, then hide again until it reveals.

## Accessibility

- With `prefers-reduced-motion: reduce`, all the content shows immediately, with no animation. Reduced motion has priority over the entrance and over `when: false`, so `onReveal` does not run again.
- Focus in a waiting element shows it at once, so a keyboard user does not focus invisible content. This does not apply with `when: false`.
- Focus during the delay or the entrance finishes the entrance at once.
- Before the script loads, server markup shows while it has focus.
- Waiting content shows in print and when JavaScript is off.
- Hidden content stays in the accessibility tree. Do not make important content depend on decorative motion.

## Good to know

<details>
<summary>Cascades</summary>

- The cascade reads its children when it reveals. A child that you add after the reveal shows with no animation.
- Only the direct element children animate. Text and children with `display: contents` show immediately.
- Do not put a reveal directly inside a cascade. The two entrances combine on the same element.
- An `animate:` or `transition:` directive on a direct child adds its own animations to the child.
- `delay` moves the start of the whole sequence. `onReveal` gets the container.

</details>

<details>
<summary>How the stylesheet hides content</summary>

- The server markup has `data-awesome-reveal="hidden"`, or `data-awesome-reveal="cascade"` for a cascade. The package reserves `data-awesome-reveal` and `data-awesome-reveal-attached`.
- The stylesheet hides content for at most 5 seconds before the script attaches the element. If the attach happens later, the content shows, then hides again until it reveals.
- The stylesheet hides with the `awesome-reveal-hold` CSS animation, which replaces your own `animation` on a waiting element until it reveals. Put your own animation on an inner element. The hold fires `animationstart` and `animationend` events, and shows in `getAnimations()`.
- An inline `opacity` with `!important`, or your own `animation` with `!important`, can show the element before the reveal.
- The stylesheet does not reach a shadow root.
- In browsers without the `scripting` media feature, such as Safari 16, content shows after 5 seconds when JavaScript is off.

</details>

<details>
<summary>Content Security Policy</summary>

The package writes no `style` attribute and no inline script. A policy such as `style-src 'self'; script-src 'self'` works in a production build when your bundler emits the package CSS as a file.

</details>

<details>
<summary>Entrance details</summary>

The `@awesome-reveal/core` README describes how the entrance works, the thresholds of tall and clipped content, performance and errors. Read it on [npm](https://www.npmjs.com/package/@awesome-reveal/core).

</details>

## Agent skills

The package includes the `adding-reveal-animations` skill, which teaches a coding agent this API. pnpm can link it into your project after you approve it.

## License

[MIT](https://github.com/awesome-reveal/awesome-reveal/blob/main/LICENSE)
