---
name: adding-reveal-animations
description: Adds reveal-on-scroll animations with the Reveal and Cascade components and the vReveal and vCascade directives of @awesome-reveal/vue, and native Web Animations keyframes. Use when you animate Vue elements that enter the viewport.
license: MIT
compatibility: Requires @awesome-reveal/vue and Vue 3.5 or later.
---

# Add reveal animations

Use the `Reveal` component, or the `vReveal` directive on an element that you render. `Cascade` and `vCascade` reveal the children of an element in sequence. The directive follows reactive options.

The package loads its stylesheet, which hides the content until it reveals. Do not import the stylesheet, except in an Astro island.

In an Astro island, add `import "@awesome-reveal/vue/reveal.css";` to the frontmatter of the page or the layout that renders the island. Astro collects the CSS of a page from the server build, which does not import the stylesheet.

Hydrate reveal content eagerly, for example with `client:load` in an Astro island. Do not use `hydrateOnVisible()` or a Nuxt `hydrate-on-visible` component for it. The stylesheet hides the server markup for at most 5 seconds. If the script attaches later, the content shows, then hides again until it reveals.

The stylesheet replaces a CSS `animation` of the hidden element or of a cascade child until the reveal, so put your own animation on an inner element.

```vue
<script setup lang="ts">
import { Cascade, Reveal, vReveal } from "@awesome-reveal/vue";
</script>

<template>
  <Reveal from="left">Hello</Reveal>
  <p v-reveal="{ from: { opacity: 0 }, delay: 100 }">Fade only</p>
  <Cascade as="ul" :interval="120">
    <li>Fast</li>
    <li>Small</li>
  </Cascade>
</template>
```

The same API in a render function:

```ts
import { h } from "vue";
import { Cascade, Reveal } from "@awesome-reveal/vue";
export const card = h(Reveal, { from: "left" }, () => "Hello");
export const list = h(Cascade, { as: "ul", interval: 120 }, () => [
  h("li", "Fast"),
  h("li", "Small"),
]);
```

Set `from` to `"top"`, `"right"`, `"bottom"` or `"left"` for an entrance that starts transparent and 24px away on that side. The defaults are `from: "bottom"`, `duration: 600` (milliseconds), `delay: 0` (milliseconds) and `threshold: 0`. Without `when`, the entrance plays one time.

Use `delay` to start separate elements at different times. During the delay, the element stays in its start state. Keep `delay` below about 300 ms. A long delay makes content appear late when the user scrolls quickly.

An element that is too large to reach `threshold` in the viewport reveals when it enters. In a scroll container that is too small to show `threshold` of it, it reveals when it leaves the visible area. So keep `threshold` low for tall elements. Focus in a waiting element shows it at once, with no entrance, except with `when: false`.

A `from` object is the complete start state: `{ opacity: 0 }` is a pure fade, and `{ scale: 0.9 }` adds no fade and no movement. A number is in pixels for `x`, `y` and `blur`, and in degrees for `rotate`. A string can contain a CSS value with its unit. The entrance animates only the properties that the start state sets, and ends at their neutral values: no offset, no rotation, no blur, a scale of 1 and an opacity of 1. The element's own `transform` stays in effect. The element's own values of the animated properties do not apply until the entrance ends, so put them on an inner element when they must apply during the entrance. Prefer a start state without `blur` on pages that must stay smooth: with a blur, Chromium runs the full entrance on the main thread.

For a custom animation, give native `Keyframe[]` in `keyframes`. Do not use `from` and `keyframes` together. Put the easing of each segment in its keyframe. End at the resting style of the element, because the animation does not keep its last keyframe. Give explicit values to the first keyframe, because WebKit can take an implicit start value from an earlier animation. Animate `opacity`, `transform`, `translate`, `scale` or `rotate`, because the browser can run them on the compositor. Do not animate layout properties such as `width`, `height`, `top`, `left` or `margin`, because they cause a layout and a paint on each frame. Do not add `will-change` for the entrance, because the browser treats an animated property as if `will-change` already names it. Leave reduced motion to the package: it shows the content with no entrance when the user prefers reduced motion.

A cascade schedules all children when its container enters the viewport, so the last children of a long list start late or out of view. For a long list, a virtualized list, or a grid that is taller than the viewport, use `Reveal` or `vReveal` on each item. For a short group, use `Cascade`, or the `vCascade` directive on an element that you render. It animates the direct element children in sequence, `interval` milliseconds apart (default 80). The first child starts after `delay`, so `delay` moves the whole sequence. It takes the same options as `Reveal`, and also `interval`. Do not install `@awesome-reveal/core` for a cascade.

The cascade reads the children when the container reveals, so a child that you add later shows with no animation. To cascade words or sentences, wrap each one in an element in the markup. Give inline children `display: inline-block`, because a transform does not apply to an inline box. Do not put a `Reveal` directly inside a `Cascade`, because the two entrances combine. Do not collect deeper descendants to animate them.

Use `when` for manual control: `true` reveals the element and `false` resets the entrance. `null` or `undefined` returns the control to the viewport. `when` does not show or hide content. With `when: false`, the element is transparent, but screen readers still read it, and the keyboard can focus its controls. To hide content, add the `hidden` attribute, or do not render it. `inert` does not hide the element. It only blocks focus, clicks and assistive technology. With `when: true`, the server still renders the element hidden, and the entrance plays after hydration.

The component emits `reveal` with the element, or with the container for a cascade. The directive calls the `onReveal` function of its options with the same element. Both run one time for each reveal, when the reveal starts, not when the entrance ends. They also run when no entrance plays, such as with reduced motion or focus. After `when: false`, the next reveal runs them again. With reduced motion, `when: false` does not reset the reveal, so they do not run again.

To wait for the end of the entrance, use the `finished` promises of the animations of the element. The promise waits for each animation of the element, also your own animations. An animation that repeats forever never finishes, so use the promise on an element that has no other animations. For a cascade, use `getAnimations({ subtree: true })` on the container, because its children animate. It resolves at once when no entrance plays. It rejects when the entrance stops early, such as after `when: false` or an unmount. Catch the rejection, or the browser reports an unhandled rejection.

```ts
import { h } from "vue";
import { Reveal } from "@awesome-reveal/vue";

export const entered = h(
  Reveal,
  {
    onReveal: (element: Element) =>
      Promise.all(element.getAnimations().map((animation) => animation.finished))
        .then(() => element.classList.add("entered"))
        .catch(() => {}),
  },
  () => "Hello",
);
```

In the consumer project, check the build, the type check, the visibility before the reveal, reduced motion and the teardown.
