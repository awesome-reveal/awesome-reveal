<script lang="ts">
  import { Reveal, type RevealProps } from "../../src/index";

  let props: RevealProps = $props();
</script>

<Reveal {...props}>
  {#snippet children({ revealed })}<span>one</span><span>{revealed}</span>{/snippet}
</Reveal>
