# @awesome-reveal/react

Reveal-on-scroll animations for React. Wrap content in `<Reveal>`, and it fades and slides in when it enters the viewport.

[![npm version](https://badgen.net/npm/v/@awesome-reveal/react)](https://www.npmjs.com/package/@awesome-reveal/react)
[![License](https://badgen.net/npm/license/@awesome-reveal/react)](https://github.com/awesome-reveal/awesome-reveal/blob/next/LICENSE)

> **Preview:** This is a prerelease of version 1.0. The API can change before the stable release. Tell us what works and what does not in [GitHub Discussions](https://github.com/awesome-reveal/awesome-reveal/discussions).

<p align="center"><img src="https://raw.githubusercontent.com/awesome-reveal/awesome-reveal/next/.github/assets/demo.gif" alt="Elements fade, slide, scale, blur and rotate in as the page scrolls" width="640"></p>

- **Simple.** One component, a hook, and a few options.
- **Native.** Built on IntersectionObserver and the Web Animations API, with no animation library.
- **SSR-ready.** Server-rendered content stays hidden until it reveals, with no flash. Works with Next.js Server Components.
- **Accessible.** Obeys the reduced-motion preference, and shows waiting content on focus and in print.
- **CSP-friendly.** Writes no inline styles and no inline scripts.

Works with React 18 and 19.

## Install

```sh
npm install @awesome-reveal/react
```

The package loads its stylesheet automatically. Only [two setups](#stylesheet-setup) need a step.

## Quick start

```tsx
import { Reveal } from "@awesome-reveal/react";

export const Hero = () => (
  <Reveal>
    <h1>Hello</h1>
  </Reveal>
);
```

The content fades in and moves up one time, when it enters the viewport.

## Usage

### Choose the entrance

`from` sets where the element starts. A side gives a fade and a 24 px movement. The default is `"bottom"`.

```jsx
<Reveal from="left">From the left</Reveal>
```

For a different entrance, give a start state. The element animates from this state to its resting style. A start state replaces the default, so add `opacity: 0` if you want a fade.

```jsx
<Reveal from={{ opacity: 0 }}>Fade only</Reveal>
<Reveal from={{ scale: 0.9 }}>Scale only</Reveal>
<Reveal from={{ opacity: 0, x: "-100%", rotate: "-5deg", blur: 8 }}>All together</Reveal>
```

A start state has the properties `opacity`, `x`, `y`, `scale`, `rotate` and `blur`. A number for `x`, `y` or `blur` is in pixels, and a number for `rotate` is in degrees. A string can contain a CSS value with its unit.

### Use your own keyframes

For full control, such as a custom easing, give native [keyframes](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats) instead of `from`. End them at the resting style of the element.

```jsx
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

```jsx
<Reveal as="h2" from="left" duration={800}>Title</Reveal>
<Reveal from={{ opacity: 0 }} delay={200}>Starts after the title</Reveal>
<Reveal threshold={0.5}>Reveals when half of it is visible</Reveal>
```

Keep `delay` below about 300 ms. A long delay makes content appear late when the user scrolls quickly.

### Reveal a list

`Cascade` reveals its direct children one after the other, when it enters the viewport. `interval` sets the time between two children, and the default is 80 ms.

```tsx
import { Cascade } from "@awesome-reveal/react";

export const Features = () => (
  <Cascade as="ul" from="left" interval={120}>
    <li>Fast</li>
    <li>Small</li>
    <li>Accessible</li>
  </Cascade>
);
```

For a long list, a virtualized list, or a grid that is taller than the viewport, wrap each item in `Reveal` instead. A cascade schedules all children at the same time, so the last children start late or out of view.

### Animate your own element

`Reveal` renders a `div` around its children. To change the tag, use `as`. To animate your own element with no wrapper, use `useReveal`:

```tsx
import { useReveal } from "@awesome-reveal/react";

export function Card() {
  const { getProps, revealed } = useReveal<HTMLElement>({ from: "left", threshold: 0.3 });
  return <article {...getProps({ className: "card" })}>{revealed ? "Hello" : "Waiting"}</article>;
}
```

Spread `getProps()` on one DOM element. If you have your own `ref`, give it to `getProps()`, and the hook merges it. For a custom component, pass the `ref` and the `data-awesome-reveal` prop to a DOM element. `useCascade` does the same for a cascade.

### Control the reveal

`when` controls the entrance from your state. `true` plays it, and `false` resets it with no exit animation. Without `when`, the viewport controls it.

`when` does not show or hide content. With `when={false}`, the element is transparent, but screen readers read it and the keyboard can focus it. `inert` does not hide content: it only blocks focus, clicks and assistive technology. To hide content, also set `hidden`, or do not render it:

```tsx
import { useState } from "react";
import { Reveal } from "@awesome-reveal/react";

export function Details() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button aria-expanded={open} onClick={() => setOpen(!open)}>
        Toggle
      </button>
      <Reveal when={open} hidden={!open} from={{ opacity: 0 }}>
        Details
      </Reveal>
    </>
  );
}
```

To play the entrance again, set `when` to `false`, then to `true`.

### Run code at the reveal

`onReveal` gets the element when the reveal starts. To wait for the end of the entrance, wait for the `finished` promises of its animations:

```tsx
import { Reveal } from "@awesome-reveal/react";

export const Card = () => (
  <Reveal
    onReveal={(element) =>
      Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished))
        .then(() => element.classList.add("entered"))
        .catch(() => {})
    }
  >
    Hello
  </Reveal>
);
```

The promise rejects when the entrance stops early, for example after `when={false}` or an unmount. Catch the rejection. It resolves at once when no entrance plays, for example with reduced motion. It also waits for your own animations of the element and its descendants.

## API

### `<Reveal>` and `<Cascade>`

| Prop                        | Type                 | Default    | Description                                                     |
| --------------------------- | -------------------- | ---------- | --------------------------------------------------------------- |
| `as`                        | HTML or SVG tag      | `"div"`    | The rendered tag                                                |
| `from`                      | `Side \| StartState` | `"bottom"` | The side or the start state of the entrance                     |
| `keyframes`                 | `Keyframe[]`         | —          | Native keyframes. You cannot use them together with `from`      |
| `duration`                  | `number`             | `600`      | The duration of the entrance, in milliseconds                   |
| `delay`                     | `number`             | `0`        | The time between the reveal and the entrance, in milliseconds   |
| `threshold`                 | `number`             | `0`        | The visible fraction, from 0 to 1, that reveals the element     |
| `when`                      | `boolean \| null`    | —          | `true` plays the entrance, `false` resets it                    |
| `onReveal`                  | `(element) => void`  | —          | Runs one time for each reveal, when it starts                   |
| `interval` (`Cascade` only) | `number`             | `80`       | The time between the entrances of two children, in milliseconds |

The components pass the other props, such as `className` and `ref`, to the rendered element.

### `useReveal(options?)` and `useCascade(options?)`

They accept the same options, except `as`. They return `getProps(props?)`, which gives the props for your element, and `revealed`, which tells if the element is revealed.

### Behavior

- The entrance plays one time. The observation stops at the reveal.
- `onReveal` also runs when no entrance plays, for example with reduced motion or focus. It runs one time for each reveal, also in StrictMode. After `when={false}`, the next reveal runs it again.
- A change to `when` or `threshold` applies immediately. A change to the other options applies at the next reveal.
- `when={false}` during the `delay` resets the entrance, and the entrance does not play.

## Stylesheet setup

The package stylesheet hides server-rendered content until it reveals. The package modules import it, and your bundler adds it to the page. Two setups need a step:

- **Astro island.** Astro does not get the CSS of an island. Import it in the page or in the layout:

  ```astro
  ---
  import "@awesome-reveal/react/reveal.css";
  ---
  ```

- **Next.js Pages Router with webpack.** Next.js does not let a package import global CSS. Add the package to `transpilePackages`:

  ```js
  // next.config.mjs
  export default { transpilePackages: ["@awesome-reveal/react"] };
  ```

The Next.js App Router and Turbopack need no step.

## Server-side rendering

`Reveal` and `Cascade` are Client Components, so a Server Component can render them with serializable props, also with native keyframes. The hooks and `onReveal` need a Client Component.

The server markup is hidden until the element reveals. If the script fails, the content shows after 5 seconds. Hydrate reveal content eagerly: if the hydration takes more than 5 seconds, the content shows, then hides again until it reveals.

## Accessibility

- With `prefers-reduced-motion: reduce`, all the content shows immediately, with no animation. Reduced motion has priority over the entrance and over `when={false}`, so `onReveal` does not run again.
- Focus in a waiting element shows it at once, so a keyboard user does not focus invisible content. This does not apply with `when={false}`.
- Focus during the delay or the entrance finishes the entrance at once.
- Focus in server markup shows it also before the script loads.
- Waiting content shows in print and when JavaScript is off.
- Hidden content stays in the accessibility tree. Do not make important content depend on decorative motion.

## Good to know

<details>
<summary>Cascades</summary>

- The cascade reads its children when it reveals. A child that you add after the reveal shows with no animation.
- Only the direct element children animate. Text and children with `display: contents` show immediately.
- Do not put a `Reveal` directly inside a `Cascade`. The two entrances combine on the same element.
- A component that returns a fragment gives one child for each element of the fragment.
- `delay` moves the start of the whole sequence. `onReveal` gets the container.

</details>

<details>
<summary>How the stylesheet hides content</summary>

- The server markup has `data-awesome-reveal="hidden"`, or `data-awesome-reveal="cascade"` for a cascade. The package reserves `data-awesome-reveal` and `data-awesome-reveal-attached`.
- The stylesheet hides with the `awesome-reveal-hold` CSS animation, which replaces your own `animation` on a waiting element until it reveals. Put your own animation on an inner element. The hold fires `animationstart` and `animationend` events, and shows in `getAnimations()`.
- An inline `opacity` with `!important`, or your own `animation` with `!important`, can show the element before the reveal.
- The stylesheet does not reach a shadow root.
- In browsers without the `scripting` media feature, such as Safari 16, content shows after 5 seconds when JavaScript is off.
- Lazy hydration, such as an Astro `client:visible` island, often attaches after 5 seconds. Then the content shows, and hides again until it reveals.

</details>

<details>
<summary>Content Security Policy</summary>

The package writes no `style` attribute and no inline script. A policy such as `style-src 'self'; script-src 'self'` works in a production build when your bundler emits the package CSS as a file. Next.js adds its own inline scripts, so it needs a nonce, as the Next.js docs describe.

</details>

<details>
<summary>Entrance details</summary>

The `@awesome-reveal/core` README describes how the entrance works, the thresholds of tall and clipped content, performance and errors. Read it on [npm](https://www.npmjs.com/package/@awesome-reveal/core).

</details>

## Migrate from v4

`react-awesome-reveal` version 5 re-exports this package. Upgrade it, or install `@awesome-reveal/react`. Then do these steps:

1. If no other code uses Emotion, remove it.
2. Import `Reveal` as a named export. v4 also had a default export.
3. Replace each effect component with `Reveal`:
   - For a fade, use `from={{ opacity: 0 }}`.
   - For directional motion, set `from` to the side where the element starts. The v4 `up` becomes `from="bottom"`, and `down` becomes `from="top"`.
   - For a more complex effect, use native keyframes.
4. Replace `fraction` with `threshold`.
5. Remove `triggerOnce`. In v4 the entrance played each time by default. Now it plays one time. To play it again, set `when` to `false`, then to `true`.
6. Replace `cascade` with the `Cascade` component. Set `interval` to the v4 `duration * damping`, in milliseconds.
7. Write the text children yourself. The library does not split text.

The default duration is 600 ms, and v4 used 1000 ms. A v4 `<Reveal>` with no `keyframes` entered from the left. To keep that motion, use `from={{ opacity: 0, x: "-100%" }}`. `Reveal` renders one element around all its children, and v4 wrapped each element child in a `div`.

## Agent skills

The package includes two skills for coding agents. pnpm can link them into your project after you approve them.

- `adding-reveal-animations` teaches this API.
- `migrating-from-v4` lists all the changes from v4.

## License

[MIT](https://github.com/awesome-reveal/awesome-reveal/blob/next/LICENSE)
