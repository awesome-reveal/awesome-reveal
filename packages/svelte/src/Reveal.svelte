<script lang="ts">
  import { createReveal, hiddenAttributes } from "@awesome-reveal/core/adapter";

  import { bind } from "./binding.svelte.js";
  import type { RevealProps } from "./types.js";

  let {
    as,
    keyframes,
    from,
    duration,
    delay,
    threshold,
    when,
    onReveal,
    children,
    ...attributes
  }: RevealProps = $props();

  const reveal = bind(
    createReveal,
    hiddenAttributes,
    () => ({ keyframes, from, duration, delay, threshold, when, onReveal }) as RevealProps,
  );
</script>

<svelte:element
  this={as ?? "div"}
  {...attributes}
  data-awesome-reveal={reveal.hidden}
  {@attach reveal.attach}
>
  {@render children?.({ revealed: reveal.revealed })}
</svelte:element>

<!--
@component
Renders an element around its children and reveals it when it enters the viewport. It renders the element hidden on the server.
-->
