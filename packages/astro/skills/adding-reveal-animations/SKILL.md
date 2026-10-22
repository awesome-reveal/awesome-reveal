---
name: adding-reveal-animations
description: Adds reveal-on-scroll animations with the Reveal and Cascade components of @awesome-reveal/astro and native Web Animations keyframes. Use when you animate elements of an Astro page that enter the viewport.
license: MIT
compatibility: Requires @awesome-reveal/astro and Astro 6 or 7.
---

# Add reveal animations

Import `Reveal` or `Cascade` in the component script (frontmatter). `Cascade` reveals the children of an element in sequence. The component loads its custom element and its CSS, and it needs no hydration directive.

Reveal a whole table with `as="table"`, or reveal content inside a table cell. The `RevealTag` type excludes document tags, table parts and SVG-only tags. Do not place `Reveal` or `Cascade` directly in a `<table>`, a table section, a row or a `<select>`: the HTML parser moves the host out of it. In a `<p>`, also inline in MDX text, use an inline tag such as `as="span"`. The parser moves a block tag, such as the default `div`, out of the host, and the host reports an error in the browser console.

Do not import a stylesheet. The package loads its stylesheet, which hides server-rendered content until it reveals. The stylesheet replaces a CSS `animation` of the hidden element or of a cascade child until the reveal, so put your own animation on an inner element.

```astro
---
import { Cascade, Reveal } from "@awesome-reveal/astro";
---

<Reveal from="left">Hello</Reveal>
<Reveal as="section" from={{ opacity: 0 }} delay={100}>Fade only</Reveal>
<Cascade as="ul" interval={120}>
  <li>Fast</li>
  <li>Small</li>
</Cascade>
```

The props types:

```ts
import type { CascadeProps, RevealProps } from "@awesome-reveal/astro";
const options: RevealProps = { from: "left", duration: 500 };
const list: CascadeProps<"ul"> = { as: "ul", interval: 120 };
export { list, options };
```

Set `from` to `"top"`, `"right"`, `"bottom"` or `"left"` for an entrance that starts transparent and 24px away on that side. The defaults are `from: "bottom"`, `duration: 600` (milliseconds), `delay: 0` (milliseconds) and `threshold: 0`. Without `when`, the entrance plays one time.

Use `delay` to start separate elements at different times. During the delay, the element stays in its start state. Keep `delay` below about 300 ms. A long delay makes content appear late when the user scrolls quickly.

An element that is too large to reach `threshold` in the viewport reveals when it enters. In a scroll container that is too small to show `threshold` of it, it reveals when it leaves the visible area. So keep `threshold` low for tall elements. Focus in a waiting element shows it at once, with no entrance, except with `when: false`.

A `from` object is the complete start state: `{ opacity: 0 }` is a pure fade, and `{ scale: 0.9 }` adds no fade and no movement. A number is in pixels for `x`, `y` and `blur`, and in degrees for `rotate`. A string can contain a CSS value with its unit. The entrance animates only the properties that the start state sets, and ends at their neutral values: no offset, no rotation, no blur, a scale of 1 and an opacity of 1. The element's own `transform` stays in effect. The element's own values of the animated properties do not apply until the entrance ends, so put them on an inner element when they must apply during the entrance. Prefer a start state without `blur` on pages that must stay smooth: with a blur, Chromium runs the full entrance on the main thread.

For a custom animation, give native `Keyframe[]` in `keyframes`. Do not use `from` and `keyframes` together. Put the easing of each segment in its keyframe. End at the resting style of the element, because the animation does not keep its last keyframe. Give explicit values to the first keyframe, because WebKit can take an implicit start value from an earlier animation. Animate `opacity`, `transform`, `translate`, `scale` or `rotate`, because the browser can run them on the compositor. Do not animate layout properties such as `width`, `height`, `top`, `left` or `margin`, because they cause a layout and a paint on each frame. Do not add `will-change` for the entrance, because the browser treats an animated property as if `will-change` already names it. Leave reduced motion to the package: it shows the content with no entrance when the user prefers reduced motion.

A cascade schedules all children when its container enters the viewport, so the last children of a long list start late or out of view. For a long list, or a grid that is taller than the viewport, use `Reveal` on each item. For a short group, use `Cascade`. It animates the direct element children in sequence, `interval` milliseconds apart (default 80). The first child starts after `delay`, so `delay` moves the whole sequence. It takes the same options as `Reveal`, and also `interval`. Do not install `@awesome-reveal/core` for a cascade.

The cascade reads the children when the container reveals, so a child that you add later shows with no animation. To cascade words or sentences, wrap each one in an element in the markup. Give inline children `display: inline-block`, because a transform does not apply to an inline box. The cascade does not animate a child with `display: contents`, such as a framework island or the host of a nested `Reveal`. Wrap an island in an element to put it in the cascade. Do not collect deeper descendants to animate them.

Use `when` for manual control: `true` reveals the element and `false` resets the entrance. `null` or `undefined` returns the control to the viewport, and a revealed element stays revealed. `when` does not show or hide content. With `when: false`, the element is transparent, but screen readers still read it, and the keyboard can focus its controls. To hide content, add the `hidden` attribute to the rendered tag, not to the host, or do not render it. `inert` does not hide the element. It only blocks focus, clicks and assistive technology. With `when: true`, the server still renders the element hidden, and the entrance plays after the client script attaches. In a client script, pass the rendered tag to `getReveal` from `@awesome-reveal/astro`, then set the `when` property of the result and read its `revealed` property. `getReveal` throws for an element that `Reveal` or `Cascade` did not render. With the `<ClientRouter />`, call it again in an `astro:page-load` listener.

The rendered tag dispatches a `reveal` event that bubbles, one time for each reveal. The event fires when the reveal starts, not when the entrance ends. It also fires when no entrance plays, such as with reduced motion or focus. After `when: false`, the next reveal fires it again. With reduced motion, `when: false` does not reset the reveal, so the event does not fire again.

To wait for the end of the entrance, use the `finished` promises of the animations of the event `target`. The promise waits for each animation of the element, also your own animations. An animation that repeats forever never finishes, so use the promise on an element that has no other animations. For a cascade, use `getAnimations({ subtree: true })` on the container, because its children animate. It resolves at once when no entrance plays. It rejects when the entrance stops early, such as after `when: false`. Catch the rejection, or the browser reports an unhandled rejection.

```ts
document.addEventListener("reveal", (event) => {
  const element = event.target as Element;
  Promise.all(element.getAnimations().map((animation) => animation.finished))
    .then(() => element.classList.add("entered"))
    .catch(() => {});
});
```

In the consumer project, check the build, the type check, the visibility before the reveal, reduced motion and the teardown.
