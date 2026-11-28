<script lang="ts">
  import { reveal, type RevealOptions } from "../../src/index";

  let { options, color }: { options?: RevealOptions; color?: string } = $props();
</script>

<div style:color={color} {@attach reveal(() => options ?? {})}><span>a</span><span>b</span></div>
