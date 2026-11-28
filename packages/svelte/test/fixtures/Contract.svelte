<script lang="ts">
  import type { ContractOptions } from "@awesome-reveal/test-utils/contract";

  import { Cascade, cascade, Reveal, reveal } from "../../src/index";

  let {
    kind,
    options,
    style,
    swap = false,
  }: {
    kind: "Reveal" | "Cascade" | "reveal" | "cascade";
    options: ContractOptions;
    style?: string;
    swap?: boolean;
  } = $props();
</script>

{#snippet items()}
  {#each [1, 2, 3] as n (n)}<span>{n}</span>{/each}
{/snippet}

{#if kind === "Reveal"}
  <Reveal {...options} as={swap ? "section" : "div"} {style} data-contract="">
    {@render items()}
  </Reveal>
{:else if kind === "Cascade"}
  <Cascade {...options} {style} data-contract="">{@render items()}</Cascade>
{:else if kind === "reveal"}
  {#key swap}
    <svelte:element
      this={swap ? "section" : "div"}
      {style}
      data-contract=""
      {@attach reveal(() => options)}
    >
      {@render items()}
    </svelte:element>
  {/key}
{:else}
  <ul {style} data-contract="" {@attach cascade(() => options)}>{@render items()}</ul>
{/if}
