<script lang="ts">
  import { cascadeHiddenAttributes, createCascade } from "@awesome-reveal/core/adapter";

  import { bind } from "./binding.svelte.js";
  import type { CascadeProps } from "./types.js";

  let {
    as,
    keyframes,
    from,
    duration,
    delay,
    threshold,
    interval,
    when,
    onReveal,
    children,
    ...attributes
  }: CascadeProps = $props();

  const reveal = bind(
    createCascade,
    cascadeHiddenAttributes,
    () =>
      ({ keyframes, from, duration, delay, threshold, interval, when, onReveal }) as CascadeProps,
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
Renders an element and reveals its direct element children in sequence, `interval` milliseconds apart, when it enters the viewport. It renders the children hidden on the server.
-->
