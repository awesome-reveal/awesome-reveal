<script lang="ts">
  import { Reveal } from "../../src/index";

  let { when }: { when?: boolean } = $props();
</script>

<Reveal as="section" style="color: red" {when}><p>hello</p></Reveal>
